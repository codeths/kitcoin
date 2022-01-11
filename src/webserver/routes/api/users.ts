import express from 'express';
import {
	DBError,
	isValidRole,
	isValidRoles,
	User,
	UserRoles,
	UserRoleTypes,
} from '../../../helpers/schema';
import {booleanFromData, request, Validators} from '../../../helpers/request';
import {IUserDoc, requestHasUser} from '../../../types';
import {getAccessToken} from '../../../helpers/oauth';
import {FilterQuery} from 'mongoose';
const router = express.Router();

router.patch(
	'/roles',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				body: {
					user: Validators.objectID,
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
				const error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

		let authorized = !!(await getAccessToken(req.user));

		res.status(200).send({
			name: req.user.name,
			email: req.user.email,
			id: req.user.id,
			roles: req.user.getRoles(),
			scopes: req.user.tokens.scopes,
			authorized,
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
							run: data =>
								isValidRoles(
									((data || '') as string).split(','),
								),
							errorMessage: 'Invalid roles list',
						}),
					),
					count: Validators.optional(
						Validators.and(
							Validators.anyNumber,
							Validators.integer,
							Validators.gt(0),
						),
					),
					me: Validators.optional(Validators.anyBoolean),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {q, roles, count, me} = req.query as {
				q: string;
				roles?: string;
				count?: string;
				me?: string;
			};

			if (q.length < 3) return res.status(200).send([]);

			let roleArray = roles
				? (roles.toUpperCase().split(',') as UserRoleTypes[])
				: null;

			let roleBitfield = roleArray
				? roleArray.reduce((field, role) => field | UserRoles[role], 0)
				: UserRoles.ALL;

			let countNum = count ? parseInt(count) : 10;

			let options: FilterQuery<IUserDoc> = {
				roles: {$bitsAnySet: roleBitfield},
			};

			if (!booleanFromData(me)) options._id = {$ne: req.user.id};

			const results = await User.fuzzySearch(q, options);

			const byID =
				q.match(/^\d{5,6}$/) && (await User.findOne().bySchoolId(q));

			let list = results
				.map(x => x.toJSON())
				.sort((a, b) => b.confidenceScore - a.confidenceScore)
				.map(user => ({
					name: user.name,
					email: user.email,
					id: user._id,
					confidence: user.confidenceScore,
				}));

			if (byID)
				list.unshift({
					name: byID.name,
					email: byID.email,
					id: byID._id,
					confidence: 100,
				});

			let filtered = list.filter(x => x.confidence >= 25);
			if (filtered.length == 0)
				filtered = list.filter(x => x.confidence >= 10);
			if (filtered.length == 0)
				filtered = list.filter(x => x.confidence >= 5);

			res.status(200).send(filtered.slice(0, countNum));
		} catch (e) {
			try {
				const error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
	},
);

export default router;
