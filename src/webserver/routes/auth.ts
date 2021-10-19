import express from 'express';
import crypto from 'crypto';
import {
	STUDENT_OAUTH_URL,
	STAFF_OAUTH_URL,
	oauthCallback,
} from '../../helpers/oauth';
const router = express.Router();

router.get(['/login', '/signin'], async (req, res) => {
	res.redirect(STUDENT_OAUTH_URL);
});

router.get(['/login/staff', '/signin/staff'], async (req, res) => {
	res.redirect(STAFF_OAUTH_URL);
});

router.get(['/logout', '/signout'], async (req, res) => {
	if (!req.session.token) return res.redirect('/');
	if (req.user) {
		req.user.tokens.session = null;
		await req.user.save();
	}
	res.redirect('/');
});

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
	return res.redirect('/');
});

router.use((req, res) => res.status(404).send());

export default router;
