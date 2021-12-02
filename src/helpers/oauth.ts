const STUDENT_USER_SCOPES = [
	'profile',
	'email',
	'https://www.googleapis.com/auth/classroom.courses.readonly',
];
const TEACHER_USER_SCOPES = [
	...STUDENT_USER_SCOPES,
	'https://www.googleapis.com/auth/classroom.rosters.readonly',
];

import {google, Auth} from 'googleapis';
import {client_id, client_secret, redirect_url} from '../config/keys.json';
import {User, IUserDoc} from './schema';

/**
 * Generate OAuth2 client and optionally set the credentials
 * @param credentials Tokens
 * @returns Google OAuth2 client
 */
function getOAuth2Client(credentials?: Auth.Credentials): Auth.OAuth2Client {
	const client = new google.auth.OAuth2(
		client_id,
		client_secret,
		redirect_url,
	);
	if (credentials) client.setCredentials(credentials);
	return client;
}

/**
 * Get a non-expired access token for a user
 * @param user The user to get a token for
 * @returns Google OAuth2 client
 */
async function getAccessToken(
	user: IUserDoc,
): Promise<Auth.OAuth2Client | null> {
	if (!user.tokens.refresh) return null;
	const oauth2Client = getOAuth2Client({
		access_token: user.tokens.access,
		refresh_token: user.tokens.refresh,
		expiry_date: user.tokens.expires?.getTime(),
	});
	const token = await oauth2Client.getAccessToken().catch(() => null);
	if (!token || !token.token) return null;
	if (token.token !== user.tokens.access) {
		user.tokens.access = token.token;
		const info = await oauth2Client.getTokenInfo(token.token);
		user.tokens.expires = new Date(info.expiry_date);
		user.tokens.scopes = info.scopes;
		await user.save();
	}
	return oauth2Client;
}

function getAuthURL(scopes: string[]) {
	const auth = getOAuth2Client();
	return auth.generateAuthUrl({
		access_type: 'offline',
		scope: scopes,
		redirect_uri: redirect_url,
		prompt: 'consent',
		include_granted_scopes: true,
	});
}

const STUDENT_OAUTH_URL = getAuthURL(STUDENT_USER_SCOPES);
const STAFF_OAUTH_URL = getAuthURL(TEACHER_USER_SCOPES);

/**
 * Handle OAuth2 callback
 * @param {string} code Code from callback query string
 * @param {string} session Session ID
 */
export async function oauthCallback(code: string, session: string) {
	return new Promise<IUserDoc>(async (resolve, reject) => {
		const auth = getOAuth2Client();
		const tokens = await auth
			.getToken(code)
			.catch(() => reject({error: 'Invalid code'}));
		if (!tokens) return;
		const {refresh_token, access_token, expiry_date, scope} = tokens.tokens;

		if (!refresh_token || !access_token || !expiry_date)
			return reject({error: 'No tokens'});
		auth.setCredentials({
			access_token,
		});
		const person = await google
			.people({version: 'v1', auth})
			.people.get({
				resourceName: 'people/me',
				personFields: ['names', 'emailAddresses'].join(','),
			})
			.catch(() => reject({error: 'Could not get user'}));
		if (!person) return;
		if (
			!person.data ||
			!person.data.names ||
			!person.data.emailAddresses ||
			!person.data.resourceName
		)
			return reject({error: 'Could not get user'});
		const name = person.data.names.find(
			name => name.metadata?.primary,
		)?.displayName;
		const email = person.data.emailAddresses.find(
			email => email.metadata?.primary,
		)?.value;
		const googleID = person.data.resourceName.split('/')[1];
		if (!name || !email) return reject({error: 'Could not get user'});

		let user = await User.findOne().byId(googleID);
		if (user) {
			if (
				user.name !== name ||
				user.email !== email ||
				user.googleID !== googleID
			) {
				user.name = name;
				user.email = email;
				user.googleID = googleID;
			}
		} else {
			user = new User({
				name,
				email,
				googleID,
			});
		}

		user.tokens = {
			refresh: refresh_token,
			access: access_token,
			expires: new Date(expiry_date),
			session,
			scopes: (scope || '').split(' '),
		};

		user = await user.save();

		return resolve(user);
	});
}

export {STUDENT_OAUTH_URL, STAFF_OAUTH_URL, getOAuth2Client, getAccessToken};
