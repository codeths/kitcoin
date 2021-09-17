import express from 'express';
import crypto from 'crypto';
import {
	STUDENT_OAUTH_URL,
	STAFF_OAUTH_URL,
	oauthCallback,
} from '../../helpers/oauth';
import {User} from '../../helpers/schema';
const router = express.Router();

router.get('/login', async (req, res) => {
	res.redirect(STUDENT_OAUTH_URL);
});

router.get('/login/staff', async (req, res) => {
	res.redirect(STAFF_OAUTH_URL);
});

router.get('/logout', async (req, res) => {
	if (!req.session.token) return res.redirect('/');
	const user = await User.findOne({'tokens.session': req.session.token});
	if (user) {
		user.tokens.session = null;
		await user.save();
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
	return res.redirect('/auth/me');
});

// DEBUG
router.get('/me', async (req, res) => {
	if (!req.session.token) return res.status(401).send('No session');
	const user = await User.findOne({'tokens.session': req.session.token});
	if (!user) return res.status(401).send('Not logged in');
	res.status(200).send({
		name: user.name,
		email: user.email,
		id: user._id,
	});
});

export default router;
