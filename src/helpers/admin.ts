import Google, {google} from 'googleapis';
import {IUserDoc} from '../types';
import {getAccessToken} from './oauth';
import {gadmin_domain, gadmin_staff_ou} from '../config/keys.json';
import {User} from './schema';

export class AdminClient {
	private token?: string;

	/**
	 * Use an existing OAuth client
	 * @param token Access Token
	 */
	public setToken(token: string): this {
		this.token = token;

		return this;
	}

	/**
	 * Create an OAuth client with a user's access token
	 * @param user DB user
	 */
	public async create(user: IUserDoc): Promise<this> {
		await getAccessToken(user);
		if (user.tokens.access) this.token = user.tokens.access;

		return this;
	}

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
		let suspended = user.suspended || user.archived;
		let staff =
			gadmin_staff_ou &&
			gadmin_staff_ou.some(ou => user.orgUnitPath?.startsWith(`/${ou}`));

		let dbUser = await User.findOne().byId(user.id);
		if (dbUser) {
			if (suspended) {
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
		} else if (!suspended) {
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
}
