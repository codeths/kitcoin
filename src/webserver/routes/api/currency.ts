import express from 'express';
import {Transaction, User} from '../../../helpers/schema';
import {request} from '../../../helpers/request';
const router = express.Router();

// Get user balance
router.get(
	'/balance/:user',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: req.params?.user == 'me' ? undefined : ['STAFF', 'ADMIN'],
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			let {user} = req.params;
			if (user == 'me') user = req.user.id;

			if (typeof user !== 'string')
				return res.status(400).send('Bad Request');

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const balance = dbUser.balance;

			res.status(200).send({balance});
		} catch (e) {
			res.status(500).send('An error occured.');
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
	async (req, res) => {
		if (!req.user) return;
		try {
			let {user} = req.params;
			if (user == 'me') user = req.user.id;

			let {
				count,
				page,
				search,
			}: {
				count?: number | string;
				page?: number | string;
				search?: string;
			} = req.query;
			if (typeof count == 'string') count = parseInt(count);
			if (typeof page == 'string') page = parseInt(page);
			if (
				(search !== undefined && typeof search !== 'string') ||
				typeof user !== 'string' ||
				(count !== undefined &&
					(typeof count !== 'number' || isNaN(count))) ||
				(page !== undefined &&
					(typeof page !== 'number' || isNaN(page)))
			)
				return res.status(400).send('Bad Request');

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const transactions = await Transaction.find().byUser(
				user,
				count,
				page,
				search,
			);

			res.status(200).send(
				await Promise.all(
					transactions.map(t => t.toAPIResponse(dbUser.id)),
				),
			);
		} catch (e) {
			res.status(500).send('An error occured.');
		}
	},
);

// Create transaction
router.post(
	'/transactions',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['STAFF'],
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			const {body} = req;
			if (!body) return res.status(400).send('Bad Request');

			const {amount, reason, user} = body;
			if (!amount || !user) return res.status(400).send('Bad Request');
			if (
				typeof amount !== 'number' ||
				(reason && typeof reason !== 'string') ||
				typeof user !== 'string'
			)
				return res.status(400).send('Bad Request');

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
			res.status(500).send('An error occured.');
		}
	},
);

export default router;
