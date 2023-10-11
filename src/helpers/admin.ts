import Google, {google} from 'googleapis';

import {
	gadmin_domain,
	gadmin_ignore_ou,
	gadmin_staff_ou,
	sync_spreadsheet_id,
} from '../config/keys.js';
import {IUser, User} from '../struct/index.js';
import {getAccessToken} from './oauth.js';

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

		if (!data) throw null;

		return data.data;
	}

	/**
	 * Fetch student IDs from the spreadsheet
	 * First column should have student IDs, second column should have student emails
	 */
	private async fetchStudentIDs() {
		if (!this.token) throw 'Could not authenticate for the Google API';
		if (!sync_spreadsheet_id) throw 'Spreadsheet not set';

		let data = await google
			.sheets('v4')
			.spreadsheets.values.get({
				access_token: this.token,
				spreadsheetId: sync_spreadsheet_id,
				range: 'A1:B',
			})
			.catch(e => {
				if (e && e.code && e.errors)
					throw `Error syncing spreadsheet: Google API ${
						e.code
					}: ${e.errors.map((x: any) => x.message).join(', ')}`;
				else throw e;
			});

		if (!data || !data.data.values) return;

		let rows = data.data.values.slice(1) as [
			string | undefined,
			string | undefined,
		][];

		rows.map(async ([id, email]) => {
			if (!email) return;
			let user = await User.findByEmail(email);
			if (!user) return;
			user.schoolID = id;
			await user.save().catch(e => {});
		});

		return;
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
				dbUser.archive();
				await dbUser.save();
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
				if (dbUser.archived) {
					dbUser.archived = false;
					modified = true;
				}

				if (modified)
					await dbUser.save().catch(e => {
						console.log(
							'Failed to save changes to user account:',
							e,
						);
					});
			}
		} else if (!exclude) {
			let newUser = new User({
				googleID: user.id,
				name: user.name?.fullName || 'Unknown',
				email: user.primaryEmail,
			});

			if (staff) newUser.setRoles(['STAFF']);

			await newUser.save().catch(e => {});
		}
	}

	/**
	 * Sync all users with Google Admin
	 * @param pageToken API Page Token
	 */
	public async processAllUsers(options?: {
		pageToken: string;
		previousUsers: string[];
	}): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (!this.token)
				return reject('Could not authenticate for the Google API');

			let users = await this.listUsers(options?.pageToken).catch(e => {
				if (e && e.code && e.errors)
					reject(
						`Error syncing admin: Google API ${e.code}: ${e.errors
							.map((x: any) => x.message)
							.join(', ')}`,
					);
				else reject(e);
			});
			if (!users || !users.users) return resolve();

			console.log(
				`processAllUsers(): processing ${users.users.length} users`,
			);
			await Promise.all(users.users.map(this.processUser));
			const currentUsers = users.users
				.map(e => e.id)
				.filter((e): e is string => typeof e === 'string');
			const allUserIds = (options?.previousUsers || []).concat(
				currentUsers,
			);

			if (users.nextPageToken) {
				return this.processAllUsers({
					pageToken: users.nextPageToken,
					previousUsers: allUserIds,
				})
					.then(e => resolve())
					.catch(e => {
						console.error('processAllUsers(): error in child:', e);
						reject();
					});
			}
			console.log('processAllUsers(): no nextPageToken; done.');

			const allDbUsers = await User.find(
				{doNotSync: {$ne: true}},
				'googleID',
			)
				.exec()
				.then(ids => ids.map(id => id.googleID));

			const idsToRemove = allDbUsers.filter(
				id => !allUserIds.includes(id),
			);

			if (idsToRemove.length > 0) {
				const users = await Promise.all(
					idsToRemove.map(id => User.findByGoogleId(id)),
				);
				console.log(
					`${idsToRemove.length} account${
						idsToRemove.length === 1 ? '' : 's'
					} not found in sync, archiving:`,
				);
				users.map(user => console.log(`\t${user?.email}`));
				await Promise.all(users.map(user => user?.archive()));
				console.log('detached users archived.');
			}

			return resolve();
		});
	}

	/**
	 * Run a user sync
	 * @param user The user to run the sync as. Must be able to access the Google Admin API
	 */
	public async startSync(user: IUser | string) {
		if (typeof user == 'string') {
			let newUser = await User.findById(user);
			if (!newUser) return;
			user = newUser;
		}
		await getAccessToken(user);
		if (!user.tokens?.access) return;
		this.token = user.tokens.access;

		console.log(`Starting sync at ${new Date().toLocaleString()}`);
		if (sync_spreadsheet_id) {
			await this.fetchStudentIDs().catch(error =>
				console.error('fetchStudentIDs failed:', error),
			);
		}
		if (gadmin_domain) {
			return this.processAllUsers()
				.then(e =>
					console.log(
						`processAllUsers finished at ${new Date().toLocaleString()}`,
					),
				)
				.catch(error =>
					console.error('processAllUsers failed:', error),
				);
		}
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
