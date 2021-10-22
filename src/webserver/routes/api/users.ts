import express from 'express';
import {isValidRoles, User} from '../../../helpers/schema';
import {request} from '../../../helpers/request';
const router = express.Router();

router.patch(
	'/roles',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['ADMIN'],
		}),
	async (req, res) => {
		if (!req.user) return;
		let {user, roles} = req.body;
		console.log(roles);
		if (!isValidRoles(roles)) return res.send(400).send('Bad Request');

		const dbUser = await User.findById(user);
		if (!dbUser) return res.status(404).send('Invalid user');

		dbUser.setRoles(roles);
		await dbUser.save();

		res.status(200).send(dbUser);
	},
);

// Get my info
router.get(
	'/me',
	async (...req) =>
		request(...req, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;
		res.status(200).send({
			name: req.user.name,
			email: req.user.email,
			id: req.user.id,
		});
	},
);

export default router;
