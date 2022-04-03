import express from 'express';
import mongoose from 'mongoose';

import {request, Validators} from '../../../helpers/request.js';
import {DBError, Transaction} from '../../../struct/index.js';

const router = express.Router();

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

			// Get array of dates from from to to
			let dates = Array.from(
				{
					length: Math.ceil(
						(to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
					),
				},
				(_, i) => new Date(from.getTime() + i * 24 * 60 * 60 * 1000),
			);

			// Get transactions in the given time range
			let transactions = await Transaction.find({
				date: {$gte: from, $lte: to},
				store: {$exists: false},
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

			res.status(200).json(groupedTransactions);
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
