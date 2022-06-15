import express from 'express';
import json2csv from 'json-2-csv';
import mongoose from 'mongoose';
import {roundCurrency} from '../../../helpers/misc.js';
import {
	booleanFromData,
	dateFromData,
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

		total = roundCurrency(total);

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
			let from =
				dateFromData(req.query.from) ||
				new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			let to = dateFromData(req.query.to) || new Date();

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
			let from =
				dateFromData(req.query.from) ||
				new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			let to = dateFromData(req.query.to) || new Date();

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
	'/transactions/top',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					from: Validators.optional(Validators.date),
					to: Validators.optional(Validators.date),
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(1)),
					),
					csv: Validators.optional(Validators.booleanString),
				},
			},
		}),
	async (req, res) => {
		let from = dateFromData(req.query.from);
		let to = dateFromData(req.query.to);
		let count = numberFromData(req.query.count) || 10;

		let query: mongoose.FilterQuery<ITransaction> = {};
		if (from || to) query.date = {};
		if (from) query.date.$gte = from;
		if (to) query.date.$lte = to;

		let steps: mongoose.PipelineStage[] = [
			{
				$match: query,
			},
			{
				$addFields: {
					amountAbs: {
						$abs: '$amount',
					},
				},
			},
			{
				$sort: {
					amountAbs: -1,
				},
			},
		];
		if (
			numberFromData(req.query.count) ||
			!(req.query.csv && booleanFromData(req.query.csv))
		)
			steps.push({$limit: count});
		let transactions = await Transaction.aggregate(steps);

		// We did add an extra field, but mongoose takes it out
		let data = await Promise.all(
			transactions
				.map(x => new Transaction(x))
				.map(x => x.toAPIResponse()),
		);

		if (req.query.csv && booleanFromData(req.query.csv)) {
			let csv = await json2csv.json2csvAsync(data, {
				keys: [
					{
						field: '_id',
						title: 'ID',
					},
					{
						field: 'date',
						title: 'Date',
					},
					{
						field: 'from.text',
						title: 'From Name',
					},
					{
						field: 'from.id',
						title: 'From ID',
					},
					{
						field: 'to.text',
						title: 'To Name',
					},
					{
						field: 'to.id',
						title: 'To ID',
					},
					{
						field: 'amount',
						title: 'Amount',
					},
					{
						field: 'reason',
						title: 'Reason',
					},
				],
				emptyFieldValue: '',
			});
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="toptransactions.csv"',
			);
			res.send(csv);
			return;
		}

		res.status(200).json(data);
	},
);

router.get(
	'/transactions/all',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					from: Validators.optional(Validators.date),
					to: Validators.optional(Validators.date),
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(1)),
					),
					skip: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(1)),
					),
					csv: Validators.optional(Validators.booleanString),
				},
			},
		}),
	async (req, res) => {
		let from = dateFromData(req.query.from);
		let to = dateFromData(req.query.to);
		let count = numberFromData(req.query.count) || undefined;
		let skip = numberFromData(req.query.skip) || 0;

		let query: mongoose.FilterQuery<ITransaction> = {};
		if (from || to) query.date = {};
		if (from) query.date.$gte = from;
		if (to) query.date.$lte = to;

		let transactions = await Transaction.find(query, null, {
			limit: count,
			skip: skip,
		});

		let data = await Promise.all(transactions.map(x => x.toAPIResponse()));

		if (req.query.csv && booleanFromData(req.query.csv)) {
			let csv = await json2csv.json2csvAsync(data, {
				keys: [
					{
						field: '_id',
						title: 'ID',
					},
					{
						field: 'date',
						title: 'Date',
					},
					{
						field: 'from.text',
						title: 'From Name',
					},
					{
						field: 'from.id',
						title: 'From ID',
					},
					{
						field: 'to.text',
						title: 'To Name',
					},
					{
						field: 'to.id',
						title: 'To ID',
					},
					{
						field: 'amount',
						title: 'Amount',
					},
					{
						field: 'reason',
						title: 'Reason',
					},
				],
				emptyFieldValue: '',
			});
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="alltransactions.csv"',
			);
			res.send(csv);
			return;
		}

		res.status(200).json(data);
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

		balance = roundCurrency(balance);

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
		let topUsersQuery = User.find({
			$and: [
				{
					roles: {$bitsAllSet: UserRoles.STUDENT},
				},
				{
					roles: {$bitsAllClear: UserRoles.STAFF},
				},
			],
		}).sort({balance: -1});

		let topUsers =
			req.query.csv &&
			booleanFromData(req.query.csv) &&
			!numberFromData(req.query.count)
				? await topUsersQuery
				: await topUsersQuery.limit(count);

		topUsers.forEach(x => {
			x.balance = roundCurrency(x.balance);
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
				emptyFieldValue: '',
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

router.get(
	'/sent/top',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['ADMIN'],
			validators: {
				query: {
					from: Validators.optional(Validators.date),
					to: Validators.optional(Validators.date),
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(1)),
					),
					csv: Validators.optional(Validators.booleanString),
				},
			},
		}),
	async (req, res) => {
		let from = dateFromData(req.query.from);
		let to = dateFromData(req.query.to);
		let count = numberFromData(req.query.count) || 10;

		let query: mongoose.FilterQuery<ITransaction> = {
			'from.id': {$exists: true},
		};
		if (from || to) query.date = {};
		if (from) query.date.$gte = from;
		if (to) query.date.$lte = to;

		let steps: mongoose.PipelineStage[] = [
			{
				$match: query,
			},
			{
				$group: {
					_id: '$from.id',
					amount: {$sum: '$amount'},
					count: {$sum: 1},
				},
			},
			{
				$sort: {
					amount: -1,
				},
			},
		];
		if (
			numberFromData(req.query.count) ||
			!(req.query.csv && booleanFromData(req.query.csv))
		)
			steps.push({$limit: count});
		let transactions: {
			_id: string;
			amount: number;
			count: number;
		}[] = await Transaction.aggregate(steps);

		let data = await Promise.all(
			transactions.map(async x => {
				let user = await User.findById(x._id);

				return {
					_id: x._id,
					name: user?.name,
					email: user?.email,
					amount: roundCurrency(x.amount),
					count: x.count,
				};
			}),
		);

		if (req.query.csv && booleanFromData(req.query.csv)) {
			let csv = await json2csv.json2csvAsync(data, {
				keys: [
					{
						field: '_id',
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
						field: 'amount',
						title: 'Amount',
					},
					{
						field: 'count',
						title: 'Count',
					},
				],
				emptyFieldValue: '',
			});
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="topsent.csv"',
			);
			res.send(csv);
			return;
		}

		res.status(200).json(data);
	},
);

export default router;
