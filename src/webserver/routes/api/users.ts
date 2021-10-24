import express from 'express';
import {isValidRoles, User, UserRoles} from '../../../helpers/schema';
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

// Search users
router.get(
	'/search',
	async (...req) =>
		request(...req, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;
		const {q, roles, count} = req.query;
		if (!q || typeof q !== 'string')
			return res.status(400).send('Bad Request');

		if (q.length < 3) return res.status(200).send([]);
		if (roles && typeof roles !== 'string')
			return res.status(400).send('Bad Request');
		let roleArray = roles ? roles.toUpperCase().split(',') : null;
		if (roleArray && !isValidRoles(roleArray))
			return res.status(400).send('Bad Request');
		let roleBitfield = roleArray
			? roleArray.reduce((field, role) => field | UserRoles[role], 0)
			: UserRoles.ALL;

		let countNum = typeof count === 'string' ? parseInt(count) : 10;
		if (isNaN(countNum)) return res.status(400).send('Bad Request');

		const results = await User.fuzzySearch(q, {
			roles: {$bitsAnySet: roleBitfield},
		});

		res.status(200).send(
			results
				.map(x => x.toJSON())
				.filter(x => x.confidenceScore > 5)
				.slice(0, countNum)
				.map(user => ({
					name: user.name,
					email: user.email,
					id: user._id,
					confidence: user.confidenceScore,
				})),
		);
	},
);

export default router;
