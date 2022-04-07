import express from 'express';
import mongoose from 'mongoose';

import {request, Validators} from '../../../helpers/request.js';
import {DBError, ITransaction, Transaction} from '../../../struct/index.js';

const router = express.Router();

async function getDailyTransactions(
	from: Date,
	to: Date,
	query: mongoose.FilterQuery<ITransaction>,
): Promise<
	{
		/** Date as YYYY-MM-DD */
		date: string;
		/** Number of transactions */
		count: number;
		/** Total transaction value */
		total: number;
	}[]
> {
	// Get array of dates from from to to
	let dates = Array.from(
		{
			length: Math.ceil(
				(to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
			),
		},
		(_, i) => new Date(from.getTime() + i * 24 * 60 * 60 * 1000),
	);

	let transactions = await Transaction.find({
		date: {$gte: from, $lte: to},
		...query,
	});

	// Group transactions by date
	let groupedTransactions = dates.map(date => {
		let dateTransactions = transactions.filter(
			transaction =>
				transaction.date.getTime() > date.getTime() &&
				transaction.date.getTime() <
					date.getTime() + 24 * 60 * 60 * 1000,
		);

		let count = dateTransactions.length;
		let total = dateTransactions.reduce((a, c) => a + c.amount, 0);

		total = Math.round(total * 100) / 100;

		return {
			date: date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			}),
			count,
			total,
		};
	});

	return groupedTransactions;
}

router.get(
	'/transactions/daily',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					from: Validators.optional(Validators.date),
					to: Validators.optional(Validators.date),
				},
			},
		}),
	async (req, res) => {
		try {
			let from = new Date(
				(req.query.from || Date.now() - 30 * 24 * 60 * 60 * 1000) as
					| string
					| number,
			);
			let to = new Date((req.query.to || Date.now()) as string | number);

			from.setHours(0, 0, 0, 0);
			to.setHours(23, 59, 59, 999);

			let transactions = await getDailyTransactions(from, to, {
				store: {$exists: false},
			});

			res.status(200).json(transactions);
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
	'/purchases/daily',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					from: Validators.optional(Validators.date),
					to: Validators.optional(Validators.date),
				},
			},
		}),
	async (req, res) => {
		try {
			let from = new Date(
				(req.query.from || Date.now() - 30 * 24 * 60 * 60 * 1000) as
					| string
					| number,
			);
			let to = new Date((req.query.to || Date.now()) as string | number);

			from.setHours(0, 0, 0, 0);
			to.setHours(23, 59, 59, 999);

			let transactions = await getDailyTransactions(from, to, {
				store: {$exists: true},
			});

			res.status(200).json(
				transactions.map(x => ({...x, total: -x.total})),
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
				res.status(500).send(`An error occured. Error ID: ${error.id}`);
			} catch (e) {}
		}
	},
);

export default router;
