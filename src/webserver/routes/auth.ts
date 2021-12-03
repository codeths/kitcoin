import express from 'express';
import crypto from 'crypto';
import {
	getAuthURL,
	oauthCallback,
	ScopeType,
	PromptType,
} from '../../helpers/oauth';
import {request} from '../../helpers/request';
const router = express.Router();

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
	if (redirect)
		res.cookie(
			'redirect',
			encodeURIComponent(redirect == true ? req.path : redirect),
			{
				maxAge: 1000 * 60 * 5,
			},
		);
	res.redirect(
		getAuthURL({
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

	const session = crypto.randomBytes(48).toString('base64');
	const user = await oauthCallback(code, session).catch(err => {
		res.status(401).send(err);
	});

	if (!user) return;
	req.session.token = session;

	return res.redirect(decodeURIComponent(req.cookies.redirect || '/home'));
});

router.use((req, res) => res.status(404).send());

export default router;
export {handleLogin};
