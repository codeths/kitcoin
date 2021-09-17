import express from 'express';
import { User, Transaction } from '../../helpers/schema';
import { Document, IUser } from '../../types';
const router = express.Router();

declare module 'express-serve-static-core' {
	interface Request {
		user: Document<IUser>;
	}
}

router.use(async (req, res, next) => {
	const user = await User.findOne({ "tokens.session": req.session?.token });
	if (user) {
		req.user = user;
	} else {
		return res.status(401).send('Unauthorized');
	}
	next();
});

router.get('/transactions', async (req, res) => {
	try {
		let { user, count = 10 } = req.query;
		if (typeof count == 'string') count = parseInt(count);
		if (typeof user !== 'string' || typeof count !== 'number' || isNaN(count)) return res.status(400).send('Bad Request');

		const dbUser = await User.findOne({ _id: user });
		if (!dbUser) return res.status(404).send('Invalid user');

		const transactions = await Transaction.find({ user: dbUser._id }, null, {
			sort: {
				date: -1
			},
			limit: count
		});

		res.status(200).send(transactions);
	} catch (e) {
		res.status(500).send('An error occured.')
	}
});

router.get('/balance', async (req, res) => {
	try {
		const { user } = req.query;
		if (typeof user !== 'string') return res.status(400).send('Bad Request');

		const dbUser = await User.findOne({ _id: user });
		if (!dbUser) return res.status(404).send('Invalid user');

		const transaction = await Transaction.findOne({ user: dbUser._id }, null, {
			sort: {
				date: -1
			}
		});

		res.status(200).send({ balance: transaction ? transaction.balance : 0 });
	} catch (e) {
		res.status(500).send('An error occured.')
	}
});

router.post('/transactions', async (req, res) => {
	try {
		const { body } = req;
		if (!body) return res.status(400).send('Bad Request');

		const { amount, reason, user } = body;
		if (!amount || !user) return res.status(400).send('Bad Request');
		if (typeof amount !== 'number' || (reason && typeof reason !== 'string') || typeof user !== 'string') return res.status(400).send('Bad Request');

		const dbUser = await User.findOne({ _id: user });
		if (!dbUser) return res.status(404).send('Invalid user');


		const lastTransaction = await Transaction.findOne({ user: dbUser._id }, null, {
			sort: {
				date: -1
			}
		});
		const oldBalance = lastTransaction ? lastTransaction.balance : 0;

		const transaction = await new Transaction({
			amount,
			reason: reason || null,
			user: dbUser._id,
			owner: req.user._id,
			balance: oldBalance + amount
		}).save();

		res.status(200).send(transaction);
	} catch (e) {
		res.status(500).send('An error occured.')
	}
});

export default router;