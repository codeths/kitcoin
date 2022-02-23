import Google, {google} from 'googleapis';

import {
	gadmin_domain,
	gadmin_ignore_ou,
	gadmin_staff_ou,
} from '../config/keys.json';
import {IUser, User} from '../struct';
import {getAccessToken} from './oauth';

export class AdminClient {
	private token?: string;

	private async listUsers(pageToken?: string) {
		if (!this.token) throw 'Could not authenticate for the Google API';
		if (!gadmin_domain) throw 'Google Admin domain not set';

		let data = await google.admin('directory_v1').users.list({
			access_token: this.token,
			domain: gadmin_domain,
			maxResults: 500,
			pageToken,
		});

		if (!data) return null;

		return data.data;
	}

	private async processUser(user: Google.admin_directory_v1.Schema$User) {
		if (!user.id) return;
		let exclude =
			user.suspended ||
			user.archived ||
			(gadmin_ignore_ou &&
				gadmin_ignore_ou.some(ou =>
					user.orgUnitPath?.startsWith(`/${ou}`),
				));
		let staff =
			gadmin_staff_ou &&
			gadmin_staff_ou.some(ou => user.orgUnitPath?.startsWith(`/${ou}`));

		let dbUser = await User.findByGoogleId(user.id);
		if (dbUser && dbUser.doNotSync) return;
		if (dbUser) {
			if (exclude) {
				await dbUser.remove();
			} else {
				let modified = false;
				if (
					user.name?.fullName &&
					dbUser.name !== user.name?.fullName
				) {
					dbUser.name = user.name?.fullName;
					modified = true;
				}
				if (user.primaryEmail && dbUser.email !== user.primaryEmail) {
					dbUser.email = user.primaryEmail;
					modified = true;
				}
				if (
					staff &&
					!dbUser.hasRole('STAFF') &&
					!dbUser.hasRole('ADMIN')
				) {
					dbUser.setRoles(['STAFF']);
					modified = true;
				}
				if (
					!staff &&
					dbUser.hasRole('STAFF') &&
					!dbUser.hasRole('ADMIN')
				) {
					dbUser.setRoles(['STUDENT']);
					modified = true;
				}

				if (modified) await dbUser.save();
			}
		} else if (!exclude) {
			let newUser = new User({
				googleID: user.id,
				name: user.name?.fullName || 'Unknown',
				email: user.primaryEmail,
			});

			if (staff) newUser.setRoles(['STAFF']);

			await newUser.save();
		}
	}

	/**
	 * Sync all users with Google Admin
	 * @param pageToken API Page Token
	 */
	public async processAllUsers(pageToken?: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (!this.token)
				reject('Could not authenticate for the Google API');

			let users = await this.listUsers(pageToken).catch(e => {
				if (e && e.code && e.errors)
					reject(
						`Google API ${e.code}: ${e.errors
							.map((x: any) => x.message)
							.join(', ')}`,
					);
				else reject(e);
			});
			if (!users || !users.users) return;
			resolve();

			await Promise.all(users.users.map(this.processUser));

			if (users.nextPageToken)
				return this.processAllUsers(users.nextPageToken);
			return;
		});
	}

	/**
	 * Run a user sync
	 * @param user The user to run the sync as. Must be able to access the Google Admin API
	 * @returns
	 */
	public async startSync(user: IUser | string) {
		if (typeof user == 'string') {
			let newUser = await User.findById(user);
			if (!newUser) return;
			user = newUser;
		}
		await getAccessToken(user);
		if (!user.tokens.access) return;
		this.token = user.tokens.access;

		return this.processAllUsers();
	}

	/**
	 * Start daily syncs
	 * @param user The user to run the sync as. Must be able to access the Google Admin API
	 */
	public startDailySyncs(user: string) {
		try {
			this.startSync(user);
		} catch (e) {}

		let endOfDay = new Date();
		endOfDay.setHours(24, 0, 0, 0);

		setTimeout(() => {
			try {
				this.startSync(user);
			} catch (e) {}
			setInterval(async () => {
				try {
					this.startSync(user);
				} catch (e) {}
			}, 1000 * 60 * 60 * 24);
		}, endOfDay.getTime() - Date.now());
	}
}
