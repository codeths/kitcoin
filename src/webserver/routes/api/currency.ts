import express from 'express';
import {Transaction, User} from '../../../helpers/schema';
import {
	numberFromData,
	request,
	stringFromData,
	validate,
	validators,
} from '../../../helpers/request';
const router = express.Router();

// Get user balance
router.get(
	'/balance/:user',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: req.params?.user == 'me' ? undefined : ['STAFF', 'ADMIN'],
		}),
	(req, res, next) =>
		validate(req, res, next, {
			params: {
				user: validators.string,
			},
		}),
	async (req, res) => {
		try {
			if (!req.user) return;

			let {user} = req.params;
			if (user == 'me') user = req.user.id;

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
		}),
	(req, res, next) =>
		validate(req, res, next, {
			params: {
				user: validators.string,
			},
			query: {
				count: validators.optional(
					validators.and(validators.integer, validators.gt(0)),
				),
				page: validators.optional(
					validators.and(validators.integer, validators.gt(0)),
				),
				search: validators.optional(validators.string),
			},
		}),
	async (req, res) => {
		try {
			if (!req.user) return;

			let {user} = req.params;
			if (user == 'me') user = req.user.id;

			let count = numberFromData(req.query.count);
			let page = numberFromData(req.query.page);
			let search = stringFromData(req.query.search);

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const query = Transaction.find().byUser(user, count, page, search);

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
				page,
				pageCount: Math.ceil(
					docCount /
						(query.getOptions().limit ?? transactions.length),
				),
				docCount,
				transactions: await Promise.all(
					transactions.map(t => t.toAPIResponse(dbUser.id)),
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
		}),
	(req, res, next) =>
		validate(req, res, next, {
			body: {
				amount: validators.number,
				reason: validators.optional(validators.string),
				user: validators.string,
			},
		}),
	async (req, res) => {
		try {
			if (!req.user) return;

			const {
				amount,
				reason,
				user,
			}: {amount: number; reason: string; user: string} = req.body;

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
