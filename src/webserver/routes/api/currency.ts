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
					user: Validators.string,
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
					user: Validators.string,
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
					user: Validators.string,
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
			}: {amount: number | `${number}`; reason: string; user: string} =
				req.body;

			if (typeof amount == 'string') amount = numberFromData(amount);
			const dbUser = await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const transaction = await new Transaction({
				amount,
				reason: reason || null,
				from: {
					id: req.user.id,
				},
				to: {
					id: dbUser.id,
				},
			}).save();

			if (transaction) {
				dbUser.balance += amount;
				await dbUser.save();
			}

			res.status(200).send(await transaction.toAPIResponse(req.user.id));
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

export default router;
