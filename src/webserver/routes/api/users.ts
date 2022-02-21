import express from 'express';
import {User} from '../../../struct';
import {
	DBError,
	isValidRoles,
	UserRoles,
	UserRoleTypes,
} from '../../../helpers/schema';
import {
	booleanFromData,
	dateFromData,
	request,
	Validators,
} from '../../../helpers/request';
import {IUser, requestHasUser} from '../../../types';
import {FilterQuery, isValidObjectId, Query} from 'mongoose';
import {MongooseFuzzyModel} from 'mongoose-fuzzy-searching';
import {AdminClient} from '../../../helpers/admin';
const router = express.Router();

function isValidSearchResult(user: IUser, req: express.Request): boolean {
	if (
		!booleanFromData(req.query.me as string | undefined) &&
		user.id === req.user!.id
	)
		return false;

	let roleArray = req.query.roles
		? ((req.query.roles as string)
				.toUpperCase()
				.split(',') as UserRoleTypes[])
		: null;

	if (roleArray && !user.hasAnyRole(roleArray)) return false;
	return true;
}

// Search users
router.get(
	'/users/search',
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

			let countNum = count ? parseInt(count) : 10;

			const results = await User.fuzzySearch<IUser>(q);

			const byID = q.match(/^\d{5,6}$/) && (await User.findBySchoolId(q));

			const byMongoID =
				(isValidObjectId(q) && (await User.findById(q))) || null;

			let list = results
				.sort((a, b) => b.confidenceScore - a.confidenceScore)
				.map(user => ({
					name: user.name,
					email: user.email,
					id: user._id,
					confidence: user.toJSON().confidenceScore,
					valid: isValidSearchResult(user, req),
				}));

			if (byID)
				list.unshift({
					name: byID.name,
					email: byID.email,
					id: byID._id,
					confidence: 100,
					valid: isValidSearchResult(byID, req),
				});

			if (byMongoID)
				list.unshift({
					name: byMongoID.name,
					email: byMongoID.email,
					id: byMongoID._id,
					confidence: 100,
					valid: isValidSearchResult(byMongoID, req),
				});

			let filtered = list.filter(x => x.confidence >= 25);
			if (filtered.length == 0)
				filtered = list.filter(x => x.confidence >= 10);
			if (filtered.length == 0)
				filtered = list.filter(x => x.confidence >= 5);
			if (filtered.length == 0)
				filtered = list.filter(x =>
					x.name.toLowerCase().includes(q.toLowerCase()),
				);

			res.status(200).send(
				filtered
					.filter(x => x.valid)
					.map(x => {
						let {valid, ...rest} = x;
						return rest;
					})
					.slice(0, countNum),
			);
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
					schoolID: Validators.optional(Validators.schoolID),
					name: Validators.string,
					balance: Validators.optional(Validators.currency(true)),
					balanceExpires: Validators.optional(Validators.date),
					weeklyBalanceMultiplier: Validators.optional(
						Validators.gte(0),
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
				balanceExpires: dateFromData(body.balanceExpires),
				weeklyBalanceMultiplier: body.weeklyBalanceMultiplier,
			};

			let user = new User(data);
			user.setRoles(body.roles);

			await user.save();

			res.status(200).send(await user.toAPIResponse());
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
			if (!user) return res.status(404).send('User not found');

			res.status(200).send(
				await user.toAPIResponse(user.id == req.user.id),
			);
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
					schoolID: Validators.optional(Validators.schoolID),
					name: Validators.string,
					balance: Validators.currency(true),
					balanceExpires: Validators.optional(Validators.date),
					weeklyBalanceMultiplier: Validators.optional(
						Validators.gte(0),
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
				balanceExpires: dateFromData(body.balanceExpires),
				weeklyBalanceMultiplier: body.weeklyBalanceMultiplier,
			};

			let user = await User.findById(req.params.id);
			if (!user) return res.status(404).send('User not found');

			user = Object.assign(user, data);
			if (body.roles) user.setRoles(body.roles);

			await user.save();

			res.status(200).send(await user.toAPIResponse());
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

router.delete(
	'/users/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
		}),
	async (req, res) => {
		try {
			let user = await User.findById(req.params.id);
			if (!user) return res.status(404).send('User not found');

			await user.remove();

			res.status(200).send();
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

router.post(
	'/users/sync',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
		}),
	async (req, res) => {
		if (!requestHasUser(req)) return;

		if (
			!req.user.tokens.scopes.includes(
				'https://www.googleapis.com/auth/admin.directory.user.readonly',
			)
		)
			return res
				.status(403)
				.send('You have not authorized the required scope.');

		new AdminClient()
			.startSync(req.user)
			.then(x => {
				res.status(200).send();
			})
			.catch(e => {
				res.status(500).send(e);
			});
	},
);

export default router;
