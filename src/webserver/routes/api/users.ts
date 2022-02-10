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

interface user {
	/**
	 * The user's email
	 */
	email: string | null;
	/**
	 * The user's Google ID
	 */
	googleID: string;
	/**
	 * The user's school ID
	 */
	schoolID: string;
	/**
	 * The user's name
	 */
	name: string | null;
	tokens: {
		/**
		 * OAuth refresh token
		 */
		refresh: string | null;
		/**
		 * OAuth access token
		 */
		access: string | null;
		/**
		 * OAuth access token expiration date
		 */
		expires: Date | null;
		/**
		 * Session token
		 */
		session: string | null;
		/**
		 * Authorized scopes
		 */
		scopes: string[];
	};
	/**
	 * The user's balance
	 */
	balance: number;
	/**
	 * Staff - when their balance resets
	 */
	balanceExpires?: Date;
	/**
	 * Staff - multiplier for weekly balance
	 */
	weeklyBalanceMultiplier?: number;
	/**
	 * The user's roles (bitfield)
	 */
	roles: number;
}

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
				roles: body.roles || [],
			};

			let user = await new User(data).save().catch(async e => {
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
			});
			if (!user) return;
			res.status(200).send(user);
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
router.get('/users/:id');

/**
 * @todo
 */
router.patch('/users/:id');

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
