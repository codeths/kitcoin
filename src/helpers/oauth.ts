const STUDENT_USER_SCOPES = ["profile", "email"];

import { google } from 'googleapis';
import { client_id, client_secret, redirect_url } from '../config/keys.json';
import { Document, IUser } from '../types';
import { User } from './schema';

function getOAuth2Client() {
	return new google.auth.OAuth2(client_id, client_secret, redirect_url);
}

function getAuthURL() {
	const auth = getOAuth2Client();
	return auth.generateAuthUrl({
		access_type: 'offline',
		scope: STUDENT_USER_SCOPES,
		redirect_uri: redirect_url,
		prompt: 'consent',
	});
}

const STUDENT_OAUTH_URL = getAuthURL();


/**
 * Handle OAuth2 callback
 * @param {string} code Code from callback query string
 * @param {string} session Session ID
 */
export async function oauthCallback(code: string, session: string) {
	return new Promise<Document<IUser>>(async (resolve, reject) => {
		const auth = getOAuth2Client();
		const tokens = await auth.getToken(code).catch(() => reject({ error: 'Invalid code' }));
		if (!tokens) return;
		const { refresh_token, access_token, expiry_date } = tokens.tokens;

		if (!refresh_token || !access_token || !expiry_date) return reject({ error: 'No tokens' });
		auth.setCredentials({
			access_token
		});
		const person = await google.people({ version: 'v1', auth }).people.get({
			resourceName: 'people/me',
			personFields: ['names', 'emailAddresses'].join(',')
		}).catch(() => reject({ error: 'Could not get user' }));
		if (!person) return;
		if (!person.data || !person.data.names || !person.data.emailAddresses) return reject({ error: 'Could not get user' });
		const name = person.data.names.find(name => name.metadata?.primary)?.displayName;
		const email = person.data.emailAddresses.find(email => email.metadata?.primary)?.value;
		if (!name || !email) return reject({ error: 'Could not get user' });

		let user = await User.findOne({ email });
		if (user) {
			if (user.name !== name) {
				user.name = name;
			}
		} else {
			user = new User({
				name,
				email
			});
		}

		user.tokens = {
			refresh: refresh_token,
			access: access_token,
			expires: new Date(expiry_date),
			session
		}

		user = await user.save();

		return resolve(user);
	});
}

export { STUDENT_OAUTH_URL };