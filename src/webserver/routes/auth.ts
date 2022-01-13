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
import {DBError} from '../../helpers/schema';
import {ErrorDetail} from '../../struct';
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

	let state = crypto.randomBytes(8).toString('hex');
	req.session.csrf = {
		state,
		redirect,
		expires: Date.now() + 1000 * 60 * 60,
	};
	res.redirect(
		307,
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
	if (!code || typeof code !== 'string') {
		let details = ErrorDetail.OAUTH_SIGN_IN_FAILED;

		let queryError = req.query.error;

		if (queryError == 'access_denied') {
			details.edit({
				title: 'Sign In Cancelled',
				description: 'If this was unintentional, please sign in again.',
			});
		}

		let error = await DBError.generate({
			details,
		});

		return res.redirect(`/error#${error ? error._id : ''}`);
	}

	csrf: {
		const sessionData = req.session.csrf;
		if (!sessionData || sessionData.expires < Date.now()) break csrf;
		const cookieState = sessionData.state;
		const redirect = sessionData.redirect;
		const reqState = req.query.state;
		if (!reqState || typeof reqState !== 'string') break csrf;
		if (cookieState !== reqState) break csrf;

		const token = crypto.randomBytes(48).toString('base64');
		req.session.token = token;
		delete req.session.csrf;
		const user = await oauthCallback(
			code,
			token,
			getRedirectUrl(req),
		).catch(err => {
			res.redirect(
				`/error#${err && err instanceof DBError ? err._id : ''}`,
			);
			return;
		});
		if (!user) return;

		return res
			.setHeader('Cache-Control', 'no-cache')
			.redirect(redirect || '/');
	}
	return res.setHeader('Cache-Control', 'no-cache').redirect(`/auth/login`);
});

router.use((req, res) => res.status(404).send());

export default router;
export {handleLogin};
