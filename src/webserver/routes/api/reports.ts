import express from 'express';
import json2csv from 'json-2-csv';
import mongoose from 'mongoose';
import {
	booleanFromData,
	numberFromData,
	request,
	Validators,
} from '../../../helpers/request.js';
import {
	DBError,
	ITransaction,
	Transaction,
	User,
} from '../../../struct/index.js';
import {UserRoles} from '../../../types/db.js';

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
			date: date.toISOString().split('T')[0],
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
					csv: Validators.optional(Validators.booleanString),
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

			if (req.query.csv && booleanFromData(req.query.csv)) {
				let csv = await json2csv.json2csvAsync(transactions, {
					keys: [
						{
							field: 'date',
							title: 'Date',
						},
						{
							field: 'count',
							title: 'Number of transactions',
						},
						{
							field: 'total',
							title: 'Total Kitcoin value',
						},
					],
				});
				res.setHeader('Content-Type', 'text/csv');
				res.setHeader(
					'Content-Disposition',
					'attachment; filename="transactions.csv"',
				);
				res.send(csv);
				return;
			}

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
					csv: Validators.optional(Validators.booleanString),
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

			if (req.query.csv && booleanFromData(req.query.csv)) {
				let csv = await json2csv.json2csvAsync(transactions, {
					keys: [
						{
							field: 'date',
							title: 'Date',
						},
						{
							field: 'count',
							title: 'Number of purchases',
						},
						{
							field: 'total',
							title: 'Total Kitcoin value',
						},
					],
				});
				res.setHeader('Content-Type', 'text/csv');
				res.setHeader(
					'Content-Disposition',
					'attachment; filename="purchases.csv"',
				);
				res.send(csv);
				return;
			}

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

router.get(
	'/balance/total',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
		}),
	async (req, res) => {
		let [{balance}] = await User.aggregate([
			{
				$match: {
					$and: [
						{
							roles: {$bitsAllSet: UserRoles.STUDENT},
						},
						{
							roles: {$bitsAllClear: UserRoles.STAFF},
						},
					],
				},
			},
			{
				$group: {
					_id: null,
					balance: {$sum: '$balance'},
				},
			},
		]);

		balance = Math.round(balance * 100) / 100;

		res.status(200).json({balance});
	},
);

router.get(
	'/balance/top',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(1)),
					),
					csv: Validators.optional(Validators.booleanString),
				},
			},
		}),
	async (req, res) => {
		let count = numberFromData(req.query.count) || 10;
		let topUsers = await User.find({
			$and: [
				{
					roles: {$bitsAllSet: UserRoles.STUDENT},
				},
				{
					roles: {$bitsAllClear: UserRoles.STAFF},
				},
			],
		})
			.sort({balance: -1})
			.limit(count);

		topUsers.forEach(x => {
			x.balance = Math.round(x.balance * 100) / 100;
		});

		if (req.query.csv && booleanFromData(req.query.csv)) {
			let csv = await json2csv.json2csvAsync(topUsers, {
				keys: [
					{
						field: 'id',
						title: 'ID',
					},
					{
						field: 'name',
						title: 'Name',
					},
					{
						field: 'email',
						title: 'Email',
					},
					{
						field: 'balance',
						title: 'Balance',
					},
				],
			});
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="topusers.csv"',
			);
			res.send(csv);
			return;
		}

		res.status(200).json(
			topUsers.map(x => ({
				_id: x.id,
				name: x.name,
				email: x.email,
				balance: x.balance,
			})),
		);
	},
);

export default router;
