import express from 'express';
import formidable from 'formidable';
import fs from 'fs';
import pkg from 'json-2-csv';

import {
	numberFromData,
	request,
	stringFromData,
	validate,
	Validators,
} from '../../../helpers/request.js';
import {DBError, IUser, Transaction, User} from '../../../struct/index.js';
import {requestHasUser} from '../../../types/index.js';

const {csv2jsonAsync} = pkg;

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

			const list = await Transaction.findByUser(dbUser.id, {
				count,
				page,
				search,
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

			let returnArray = Array.isArray(user);

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
			roles: ['ADMIN'],
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

			let badRequest = validate(req, {
				body: {
					amount: Validators.currency,
					fromUser: Validators.optional(Validators.objectID),
					fromText: Validators.optional(Validators.string),
					reason: Validators.optional(Validators.string),
				},
			});
			if (badRequest) return res.status(400).send(badRequest);

			let amount: number = numberFromData(
				req.body.amount as number | `${number}`,
			);
			let fromUser: string | undefined = req.body.fromUser;
			let fromText: string | undefined = req.body.fromText;
			if (!fromUser && !fromText)
				return res
					.status(400)
					.send('Either fromUser or fromText must be specified');
			let reason: string = req.body.reason;

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

			if (file.mimetype !== 'text/csv')
				return res.status(400).send('File is not a CSV');

			let csvString = fs.readFileSync(file.filepath).toString();
			fs.rmSync(file.filepath);

			let json = await csv2jsonAsync(csvString);
			if (!json || !Array.isArray(json))
				return res.status(400).send('Invalid CSV');
			if (json.some(j => typeof j !== 'object'))
				return res.status(400).send('Invalid CSV');

			let ids: string[] = json
				.map(x => x['Student\u00A0ID'])
				.filter(x => x);

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

			res.status(200).send(transactions);

			return res.status(200).send(json);
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
