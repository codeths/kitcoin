const OAUTH_SCOPES = {
	STUDENT: [
		'profile',
		'email',
		'https://www.googleapis.com/auth/classroom.courses.readonly',
	],
	STAFF: [
		'profile',
		'email',
		'https://www.googleapis.com/auth/classroom.courses.readonly',
		'https://www.googleapis.com/auth/classroom.rosters.readonly',
	],
	ADMIN_SYNC: [
		'https://www.googleapis.com/auth/admin.directory.user.readonly',
	],
};

type ScopeType = keyof typeof OAUTH_SCOPES;
type PromptType = 'none' | 'consent' | 'select_account';

import {google, Auth} from 'googleapis';
import express from 'express';
import {client_id, client_secret, oauthDomain} from '../config/keys.json';
import {User, IUserDoc, DBError} from './schema';
import {ErrorDetail} from '../struct';

/**
 * Generate OAuth2 client and optionally set the credentials
 * @param credentials Tokens
 * @returns Google OAuth2 client
 */
function getOAuth2Client(
	credentials?: Auth.Credentials,
	redirect_url?: string,
): Auth.OAuth2Client {
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

function getAuthURL({
	redirect,
	state,
	scopes = OAUTH_SCOPES.STUDENT,
	user,
	prompt = 'consent',
}: {
	state: string;
	redirect: string;
	scopes?: string[] | ScopeType;
	user?: string | undefined;
	prompt?: PromptType | undefined;
}) {
	if (!Array.isArray(scopes)) scopes = OAUTH_SCOPES[scopes];
	const auth = getOAuth2Client();
	return auth.generateAuthUrl({
		access_type: 'offline',
		scope: scopes,
		state,
		redirect_uri: redirect,
		prompt,
		include_granted_scopes: true,
		login_hint: user,
		hd: oauthDomain || undefined,
	});
}

/**
 * Handle OAuth2 callback
 * @param {string} code Code from callback query string
 * @param {string} session Session ID
 */
export async function oauthCallback(
	code: string,
	session: string,
	redirect: string,
) {
	return new Promise<IUserDoc>(async (resolve, reject) => {
		const auth = getOAuth2Client(undefined, redirect);
		const tokens = await auth.getToken(code).catch(async () => {
			let error = await DBError.generate({
				details: ErrorDetail.OAUTH_SIGN_IN_FAILED,
			});
			reject(error);
			return;
		});
		if (!tokens) return;
		const {refresh_token, access_token, expiry_date, scope} = tokens.tokens;

		if (!refresh_token || !access_token || !expiry_date) {
			let error = await DBError.generate({
				details: ErrorDetail.OAUTH_SIGN_IN_FAILED,
			});
			return reject(error);
		}

		auth.setCredentials({
			access_token,
		});
		const person = await google
			.people({version: 'v1', auth})
			.people.get({
				resourceName: 'people/me',
				personFields: ['names', 'emailAddresses'].join(','),
			})
			.catch(async () => {
				let error = await DBError.generate({
					details: ErrorDetail.OAUTH_SIGN_IN_FAILED,
				});
				reject(error);
				return;
			});
		if (!person) return;
		if (
			!person.data ||
			!person.data.names ||
			!person.data.emailAddresses ||
			!person.data.resourceName
		) {
			let error = await DBError.generate({
				details: ErrorDetail.OAUTH_SIGN_IN_FAILED,
			});
			return reject(error);
		}
		const name = person.data.names.find(
			name => name.metadata?.primary,
		)?.displayName;
		const email = person.data.emailAddresses.find(
			email => email.metadata?.primary,
		)?.value;
		const googleID = person.data.resourceName.split('/')[1];
		if (!name || !email) {
			let error = await DBError.generate({
				details: ErrorDetail.OAUTH_SIGN_IN_FAILED,
			});
			return reject(error);
		}
		if (oauthDomain && !email.endsWith(`@${oauthDomain}`)) {
			let error = await DBError.generate({
				details: ErrorDetail.OAUTH_SIGN_IN_FAILED.clone({
					title: 'Invalid email domain',
					description: `Please sign in with your ${oauthDomain} email.`,
				}),
			});
			return reject(error);
		}
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

function getRedirectUrl(req: express.Request) {
	return `${req.protocol}://${req.get('host')}/auth/cbk`;
}

export {
	getAuthURL,
	ScopeType,
	PromptType,
	getOAuth2Client,
	getAccessToken,
	getRedirectUrl,
};
