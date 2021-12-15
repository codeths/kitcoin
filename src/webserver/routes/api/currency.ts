import express from 'express';
import {Transaction, User} from '../../../helpers/schema';
import {
	numberFromData,
	request,
	stringFromData,
	Validators,
} from '../../../helpers/request';
import {requestHasUser} from '../../../types';

const router = express.Router();

// Get user balance
router.get(
	'/balance/:user',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: req.params?.user == 'me' ? undefined : ['STAFF', 'ADMIN'],
			validators: {
				params: {
					user: Validators.or(
						Validators.objectID,
						Validators.streq('me'),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {user} = req.params;

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const balance = dbUser.balance;

			res.status(200).send({balance});
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

// Get user transactions
router.get(
	'/transactions/:user',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: req.params?.user == 'me' ? undefined : ['STAFF', 'ADMIN'],
			validators: {
				params: {
					user: Validators.or(
						Validators.objectID,
						Validators.streq('me'),
					),
				},
				query: {
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
					page: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
					search: Validators.optional(Validators.string),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {user} = req.params;

			let count = numberFromData(req.query.count);
			let page = numberFromData(req.query.page);
			let search = stringFromData(req.query.search);

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const query = Transaction.find().byUser(dbUser.id, {
				count,
				page,
				search,
			});

			const [transactions, docCount] = await Promise.all([
				query.exec(),
				query
					.clone()
					.setOptions({
						skip: 0,
						limit: undefined,
					})
					.countDocuments()
					.exec(),
			]);

			res.status(200).send({
				page: page ?? 1,
				pageCount: Math.ceil(
					docCount /
						(query.getOptions().limit ?? transactions.length),
				),
				docCount,
				transactions: await Promise.all(
					transactions.map(t => t.toAPIResponse(req.user.id)),
				),
			});
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

// Create transaction
router.post(
	'/transactions',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STAFF'],
			validators: {
				body: {
					amount: Validators.currency,
					reason: Validators.optional(Validators.string),
					user: Validators.arrayOrValue(Validators.objectID),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {
				amount,
				reason,
				user,
			}: {
				amount: number | `${number}`;
				reason: string;
				user: string | string[];
			} = req.body;

			if (!Array.isArray(user)) user = [user];
			user = user.filter(u => u != req.user.id);

			if (typeof amount == 'string') amount = numberFromData(amount);
			let dbUsers = await Promise.all(
				user.map(user => User.findById(user)),
			);
			dbUsers = dbUsers.filter(u => u);

			if (req.user.balance < amount * dbUsers.length)
				return res.status(403).send('Your balance is too low!');

			const transactions = await Promise.all(
				dbUsers.map(async dbUser => {
					let t = await new Transaction({
						amount,
						reason: reason || null,
						from: {
							id: req.user.id,
						},
						to: {
							id: dbUser!.id,
						},
					}).save();
					dbUser!.balance += amount as number;
					await dbUser!.save();
					return t.toAPIResponse(req.user.id);
				}),
			);
			req.user.balance -= amount * transactions.length;
			await req.user.save();

			res.status(200).send(transactions);
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

export default router;
