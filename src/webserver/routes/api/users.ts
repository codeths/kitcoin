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

router.post(
	'/users',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				body: {
					email: Validators.optional(Validators.string),
					googleID: Validators.string,
					schoolID: Validators.optional(Validators.string),
					name: Validators.optional(Validators.string),
					balance: Validators.optional(Validators.currency),
					balanceExpires: Validators.optional(Validators.date),
					weeklyBalanceMultiplier: Validators.optional(
						Validators.number,
					),
					roles: Validators.optional(
						Validators.array(Validators.role),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			let {body} = req;

			let data = {
				email: body.email,
				googleID: body.googleID,
				schoolID: body.schoolID,
				name: body.name,
				balance: body.balance,
				balanceExpires: body.balanceExpires,
				weeklyBalanceMultiplier: body.weeklyBalanceMultiplier,
			};

			let user = new User(data);
			user.setRoles(body.roles);

			await user.save();

			res.status(200).send(user.toAPIResponse());
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
				res.status(500).send(`An error occured. Error ID: ${error.id}`);
			} catch (e) {}
		}
	},
);

router.get(
	'/users/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: req.params?.id == 'me' ? undefined : ['ADMIN'],
			validators: {
				params: {
					id: Validators.or(
						Validators.objectID,
						Validators.streq('me'),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let userID = req.params.id;

			const user =
				userID == 'me' ? req.user : await User.findById(userID);
			if (!user) return res.status(404).send('Invalid user');

			let json = user.toAPIResponse();

			let authorized = !!(await getAccessToken(user));
			let scopes = req.user.tokens?.scopes;

			res.status(200).send({
				...json,
				authorized,
				scopes,
			});
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

/**
 * @todo
 */
router.patch(
	'/users/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				params: {
					id: Validators.objectID,
				},
				body: {
					email: Validators.optional(Validators.string),
					googleID: Validators.string,
					schoolID: Validators.optional(Validators.string),
					name: Validators.optional(Validators.string),
					balance: Validators.optional(Validators.currency),
					balanceExpires: Validators.optional(Validators.date),
					weeklyBalanceMultiplier: Validators.optional(
						Validators.number,
					),
					roles: Validators.optional(
						Validators.array(Validators.role),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			let {body} = req;

			let data = {
				email: body.email,
				googleID: body.googleID,
				schoolID: body.schoolID,
				name: body.name,
				balance: body.balance,
				balanceExpires: body.balanceExpires,
				weeklyBalanceMultiplier: body.weeklyBalanceMultiplier,
			};

			let user = await User.findById(req.params.id).catch(e => {
				res.status(400).send('User not found');
			});
			if (!user) return;

			user = Object.assign(user, body) as typeof user;
			if (body.roles) user.setRoles(body.roles);

			await user.save();

			res.status(200).send(user.toAPIResponse());
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
				res.status(500).send(`An error occured. Error ID: ${error.id}`);
			} catch (e) {}
		}
	},
);

/**
 * @todo
 */
router.delete('/users/:id');

// Get my info
router.get(
	'/me',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
		}),
	async (req, res) => {
		if (!requestHasUser(req)) return;

		let json = req.user.toAPIResponse();

		let authorized = !!(await getAccessToken(req.user));
		let scopes = req.user.tokens?.scopes;

		res.status(200).send({
			...json,
			authorized,
			scopes,
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
