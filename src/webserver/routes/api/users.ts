import express from 'express';
import {
	isValidRole,
	isValidRoles,
	User,
	UserRoles,
	UserRoleTypes,
} from '../../../helpers/schema';
import {request, Validators} from '../../../helpers/request';
import {requestHasUser} from '../../../types';
const router = express.Router();

router.patch(
	'/roles',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				body: {
					user: Validators.string,
					roles: {
						run: (data: unknown) =>
							typeof data == 'string' && isValidRoles(data),
						errorMessage: 'Invalid roles list',
					},
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {user, roles} = req.body;

			const dbUser = await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			dbUser.setRoles(roles);
			await dbUser.save();

			res.status(200).send(dbUser);
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

// Get my info
router.get(
	'/me',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
		}),
	async (req, res) => {
		if (!requestHasUser(req)) return;

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
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				query: {
					q: Validators.string,
					roles: Validators.optional(
						Validators.and(Validators.string, {
							run: isValidRole,
							errorMessage: 'Invalid roles list',
						}),
					),
					count: Validators.optional(Validators.anyNumber),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {q, roles, count} = req.query as {
				q: string;
				roles?: string;
				count?: string;
			};

			if (q.length < 3) return res.status(200).send([]);

			let roleArray = roles
				? (roles.toUpperCase().split(',') as UserRoleTypes[])
				: null;

			let roleBitfield = roleArray
				? roleArray.reduce((field, role) => field | UserRoles[role], 0)
				: UserRoles.ALL;

			let countNum = count ? parseInt(count) : 10;

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
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

export default router;
