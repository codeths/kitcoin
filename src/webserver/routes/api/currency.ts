import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import json2csv from 'json-2-csv';
import readExcel from 'read-excel-file/node/index.commonjs.js';

import {
	numberFromData,
	request,
	stringFromData,
	validate,
	Validators,
} from '../../../helpers/request.js';
import {DBError, IUser, Transaction, User} from '../../../struct/index.js';
import {requestHasUser} from '../../../types/index.js';

const {csv2jsonAsync} = json2csv;

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
					user: Validators.optional(Validators.objectID),
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
			let userSearch = stringFromData(req.query.user);

			const dbUser = user == 'me' ? req.user : await User.findById(user);
			if (!dbUser) return res.status(404).send('Could not find user');

			const searchUser = userSearch
				? await User.findById(userSearch)
				: null;
			if (userSearch && !searchUser)
				return res.status(404).send('Could not find search user');

			const list = await Transaction.findByUser(dbUser.id, {
				count,
				page,
				search,
				userSearch,
			});

			res.status(200).send({
				page: list.page,
				pageCount: list.pageCount,
				docCount: list.docCount,
				transactions: await Promise.all(
					list.transactions.map(t =>
						t.toAPIResponse(dbUser, req.user),
					),
				),
			});
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
					reason: Validators.optional(Validators.stringNotEmpty),
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

			let returnArray = Array.isArray(user);

			if (!Array.isArray(user)) user = [user];
			if (user.length == 0) return res.status(400).send('No users');
			if (user.includes(req.user.id))
				return res
					.status(400)
					.send('You cannot send Kitcoin to yourself');

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
						reason: reason?.trim() || null,
						from: {
							id: req.user.id,
						},
						to: {
							id: dbUser!.id,
						},
					}).save();
					dbUser!.balance += amount as number;
					await dbUser!.save();
					return t.toAPIResponse(req.user);
				}),
			);
			req.user.balance -= amount * transactions.length;
			await req.user.save();

			res.status(200).send(returnArray ? transactions : transactions[0]);
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

// Bulk create transactions
router.post(
	'/transactions/bulk',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['BULK_SEND'],
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const form = formidable();

			let [err, fields, files]: [
				any,
				formidable.Fields,
				formidable.Files,
			] = await new Promise((resolve, reject) =>
				form.parse(req, (...args) => resolve(args)),
			);

			if (err) return res.status(400).send('Invalid form data');

			for (let key in fields) {
				if (Array.isArray(fields[key])) fields[key] = fields[key][0];
			}

			req.body = {
				amount: fields.amount,
				fromUser: fields.fromUser,
				fromText: fields.fromText,
				reason: fields.reason,
			};

			let badRequest = validate(
				req,
				{
					body: {
						amount: Validators.currency,
						fromUser: Validators.optional(Validators.objectID),
						fromText: Validators.optional(
							Validators.stringNotEmpty,
						),
						reason: Validators.optional(Validators.stringNotEmpty),
					},
				},
				{},
			);
			if (badRequest) return res.status(400).send(badRequest);

			let amount: number = numberFromData(
				req.body.amount as number | `${number}`,
			);
			let fromUser: string | undefined = req.body.fromUser;
			let fromText: string | undefined = req.body.fromText?.trim();
			if (!fromUser && !fromText)
				return res
					.status(400)
					.send('Either fromUser or fromText must be specified');
			let reason: string | undefined = req.body.reason?.trim();

			let from = fromUser
				? {
						id: fromUser,
				  }
				: {
						text: fromText,
				  };

			let file = files.data;
			if (!file) return res.status(400).send('No file provided');
			if (Array.isArray(file)) {
				if (file.length > 1)
					return res.status(400).send('Too many files');
				file = file[0];
			}

			if (
				!file.mimetype ||
				![
					'text/csv',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				].includes(file.mimetype)
			)
				return res
					.status(400)
					.send('File is not a CSV or Excel document');

			let ids: string[] = [];
			if (file.mimetype == 'text/csv') {
				let json = await csv2jsonAsync(
					fs.readFileSync(file.filepath).toString(),
				);

				if (!json || !Array.isArray(json))
					return res.status(400).send('Invalid CSV');
				if (json.some(j => typeof j !== 'object'))
					return res.status(400).send('Invalid CSV');

				let keys = Object.keys(json[0]);
				ids = json.map(x => x[keys[0]]).filter(x => x);
			} else {
				let json = await readExcel(file.filepath);

				if (!json || !Array.isArray(json))
					return res.status(400).send('Invalid Excel document');
				if (json.some(j => typeof j !== 'object'))
					return res.status(400).send('Invalid Excel document');

				ids = json
					.slice(1)
					.map(x => x[0]?.toString())
					.filter(x => x && typeof x == 'string') as string[];
			}
			fs.rmSync(file.filepath);

			let dbUsers = (
				await Promise.all(ids.map(user => User.findBySchoolId(user)))
			).filter(u => u) as IUser[];

			const transactions = await Promise.all(
				dbUsers.map(async dbUser => {
					let t = await new Transaction({
						amount,
						reason: reason || null,
						from,
						to: {
							id: dbUser.id,
						},
					}).save();
					dbUser!.balance += amount as number;
					await dbUser!.save();
					return t.toAPIResponse(req.user);
				}),
			);

			return res.status(200).send(transactions);
		} catch (e) {
			try {
				let error = await DBError.generate(
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

// Delete transaction
router.delete(
	'/transactions/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STAFF', 'ADMIN'],
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {id} = req.params;

			const transaction = await Transaction.findById(id);
			if (!transaction)
				return res.status(404).send('Transaction does not exist.');
			if (!transaction.canManage(req.user))
				return res
					.status(403)
					.send('You are not allowed to delete this transaction.');

			await transaction.delete();
			let fromUser = await User.findById(transaction.from.id);
			if (
				fromUser &&
				fromUser.hasRole('STAFF') &&
				(!fromUser.balanceExpires ||
					fromUser.balanceExpires.getTime() -
						1000 * 60 * 60 * 24 * 7 <
						transaction.date.getTime())
			) {
				fromUser.balance += transaction.amount;
				await fromUser.save();
			}
			let toUser =
				transaction.to.id && (await User.findById(transaction.to.id));
			if (toUser) {
				toUser.balance -= transaction.amount;
				await toUser.save();
			}
			res.status(200).send('Transaction deleted.');
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
