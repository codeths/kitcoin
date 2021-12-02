import express from 'express';
import crypto from 'crypto';
import {getAuthURL, oauthCallback} from '../../helpers/oauth';
import {request} from '../../helpers/request';
const router = express.Router();

router.get(
	['/login', '/signin'],
	(req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		res.redirect(
			getAuthURL({
				user:
					req.query.hint == 'true' && req.user
						? req.user.googleID
						: undefined,
			}),
		);
	},
);

router.get(
	['/login/staff', '/signin/staff'],
	(req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		res.redirect(
			getAuthURL({
				scopes: 'STAFF',
				user:
					req.query.hint == 'true' && req.user
						? req.user.googleID
						: undefined,
			}),
		);
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

	// DEBUG
	return res.redirect('/home');
});

router.use((req, res) => res.status(404).send());

export default router;
