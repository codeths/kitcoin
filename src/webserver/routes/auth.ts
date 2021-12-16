import express from 'express';
import crypto from 'crypto';
import {
	getAuthURL,
	oauthCallback,
	ScopeType,
	PromptType,
	getRedirectUrl,
} from '../../helpers/oauth';
import {request} from '../../helpers/request';
const router = express.Router();

const ALLOWED_REDIRECTS: (string | RegExp)[] = [
	'/student',
	'/staff',
	'/admin',
	'/store',
	'/home',
	'/',
	/\/store\/\w+/,
];

function handleLogin(
	req: express.Request,
	res: express.Response,
	{
		scopes,
		prompt,
		redirect,
		hint,
	}: {
		hint?: boolean | undefined;
		scopes?: string[] | ScopeType | undefined;
		prompt?: PromptType | undefined;
		redirect?: true | string | undefined;
	} = {},
) {
	if (!redirect && typeof req.query.redirect == 'string')
		redirect = decodeURIComponent(req.query.redirect).toLowerCase();
	if (redirect === true) redirect = req.path;
	if (
		redirect &&
		typeof redirect === 'string' &&
		!ALLOWED_REDIRECTS.some(r =>
			r instanceof RegExp
				? new RegExp(`^${r.source}$`).test(redirect as string)
				: r === redirect,
		)
	)
		redirect = undefined;

	let state = `${crypto.randomBytes(8).toString('hex')}-${encodeURIComponent(
		redirect || '/',
	)}`;
	res.cookie('state', state, {
		domain: req.hostname,
	});
	res.redirect(
		getAuthURL({
			state,
			redirect: getRedirectUrl(req),
			scopes,
			prompt,
			user:
				(hint || req.query.hint == 'true') && req.user
					? req.user.googleID
					: undefined,
		}),
	);
}

router.get(
	['/login', '/signin'],
	(req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		handleLogin(req, res);
	},
);

router.get(
	['/login/staff', '/signin/staff'],
	(req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		handleLogin(req, res, {
			scopes: 'STAFF',
		});
	},
);

router.get(
	['/logout', '/signout'],
	(req, res, next) =>
		request(req, res, next, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.session.token) return res.redirect('/');
		if (req.user) {
			req.user.tokens.session = null;
			await req.user.save();
		}
		res.redirect('/');
	},
);

router.get('/cbk', async (req, res) => {
	const code = req.query.code;
	if (!code || typeof code !== 'string')
		return res.status(400).send('Missing code');

	const cookieState = req.cookies.state;
	const reqState = req.query.state;
	let [, redirect] = (
		(typeof cookieState == 'string' && cookieState) ||
		(typeof reqState == 'string' && reqState) ||
		''
	).split('-');
	if (redirect) redirect = decodeURIComponent(redirect);
	if (
		!redirect ||
		!ALLOWED_REDIRECTS.some(r =>
			r instanceof RegExp
				? new RegExp(`^${r.source}$`).test(redirect as string)
				: r === redirect,
		)
	)
		redirect = '/';

	if (!reqState || typeof reqState !== 'string')
		return res
			.status(400)
			.redirect(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
	if (reqState !== cookieState)
		return res
			.status(403)
			.redirect(`/auth/login?redirect=${encodeURIComponent(redirect)}`);

	const session = crypto.randomBytes(48).toString('base64');
	const user = await oauthCallback(code, session, getRedirectUrl(req)).catch(
		err => {
			res.status(401).send(err);
		},
	);

	if (!user) return;
	req.session.token = session;
	res.clearCookie('state');

	return res.redirect(redirect);
});

router.use((req, res) => res.status(404).send());

export default router;
export {handleLogin};
