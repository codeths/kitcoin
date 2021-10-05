import express from 'express';
import {User, Transaction, isValidRoles} from '../../helpers/schema';
import {getAccessToken} from '../../helpers/oauth';
import {google} from 'googleapis';
import {request} from '../../helpers/request';
const router = express.Router();

// Get my transactions
router.get(
	'/transactions/me',
	async (...req) =>
		request(...req, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			let {
				count,
				page,
			}: {
				count?: number | string;
				page?: number | string;
			} = req.query;
			if (typeof count == 'string') count = parseInt(count);
			if (typeof page == 'string') page = parseInt(page);
			if (
				(count !== undefined &&
					(typeof count !== 'number' || isNaN(count))) ||
				(page !== undefined &&
					(typeof page !== 'number' || isNaN(page)))
			)
				return res.status(400).send('Bad Request');

			const transactions = await Transaction.find().byUser(
				req.user.id,
				count,
				page,
			);

			res.status(200).send(
				await Promise.all(
					transactions.map(t => t.toAPIResponse(req.user!.id)),
				),
			);
		} catch (e) {
			res.status(500).send('An error occured.');
		}
	},
);

// Get user transactions
router.get(
	'/transactions/:user',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['STAFF', 'ADMIN'],
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			let {user} = req.params;
			let {
				count,
				page,
			}: {
				count?: number | string;
				page?: number | string;
			} = req.query;
			if (typeof count == 'string') count = parseInt(count);
			if (typeof page == 'string') page = parseInt(page);
			if (
				typeof user !== 'string' ||
				(count !== undefined &&
					(typeof count !== 'number' || isNaN(count))) ||
				(page !== undefined &&
					(typeof page !== 'number' || isNaN(page)))
			)
				return res.status(400).send('Bad Request');

			const dbUser = await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const transactions = await Transaction.find().byUser(
				user,
				count,
				page,
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

// Get my balance
router.get(
	'/balance/me',
	async (...req) =>
		request(...req, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			const balance = req.user.balance;

			res.status(200).send({balance});
		} catch (e) {
			res.status(500).send('An error occured.');
		}
	},
);

// Get user balance
router.get(
	'/balance/:user',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['STAFF'],
		}),
	async (req, res) => {
		if (!req.user) return;
		try {
			const {user} = req.params;
			if (typeof user !== 'string')
				return res.status(400).send('Bad Request');

			const dbUser = await User.findById(user);
			if (!dbUser) return res.status(404).send('Invalid user');

			const balance = dbUser.balance;

			res.status(200).send({balance});
		} catch (e) {
			res.status(500).send('An error occured.');
		}
	},
);

// CURRENTLY DOES NOT WORK DUE TO ORGANIZATION PERMISSIONS (https://support.google.com/a/answer/6343701)
router.get('/search', async (req, res) => {
	if (!req.user) return;
	if (!req.query.search || typeof req.query.search !== 'string')
		return res.status(400).send('Bad Request');
	const client = await getAccessToken(req.user);
	if (!client) return res.status(401).send('Google authentication failed.');
	const directoryResults = await google
		.people({version: 'v1', auth: client})
		.people.searchDirectoryPeople({
			query: req.query.search,
			readMask: ['names', 'emailAddresses'].join(','),
			mergeSources: ['DIRECTORY_MERGE_SOURCE_TYPE_CONTACT'],
			sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT'],
		})
		.catch(e => null);
	if (!directoryResults) return res.status(500).send('An error occured.');
	// TODO: handle response before sending to client.
	res.status(200).send(directoryResults);
});

// Get classes
router.get(
	'/classes',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['STAFF'],
		}),
	async (req, res) => {
		if (!req.user) return;
		const client = await getAccessToken(req.user);
		if (!client)
			return res.status(401).send('Google authentication failed.');

		const classes = await google
			.classroom({version: 'v1', auth: client})
			.courses.list({teacherId: 'me'})
			.catch(e => null);
		if (!classes) return res.status(500).send('An error occured.');
		if (!classes.data || !classes.data.courses)
			return res.status(200).send([]);
		res.status(200).send(
			classes.data.courses
				.map(c => ({
					id: c.id,
					name: c.name,
					section: c.section,
				}))
				.filter(x => x.id && true),
		);
	},
);

// Get students in class
router.get(
	'/students/:class',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['STAFF'],
		}),
	async (req, res) => {
		if (!req.user) return;
		if (!req.params.class || typeof req.params.class !== 'string')
			return res.status(400).send('Bad Request');
		const client = await getAccessToken(req.user);
		if (!client)
			return res.status(401).send('Google authentication failed.');

		const students = await google
			.classroom({version: 'v1', auth: client})
			.courses.students.list({courseId: req.params.class, pageSize: 1000})
			.catch(e => null);

		if (!students) return res.status(500).send('An error occured.');
		if (!students.data || !students.data.students)
			return res.status(200).send([]);

		const data = students.data.students
			.map(s => ({
				id: s.userId,
				name: s.profile?.name?.fullName,
			}))
			.filter(x => x.id && true) as {
			id: string;
			name: string | null;
		}[];

		data.forEach(async student => {
			const user = await User.findOne().byId(student.id);
			if (!user)
				new User({googleID: student.id, name: student.name})
					.save()
					.catch(e => null);
		});
		res.status(200).send(data);
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

router.patch(
	'/roles',
	async (...req) =>
		request(...req, {
			authentication: true,
			roles: ['ADMIN'],
		}),
	async (req, res) => {
		if (!req.user) return;
		let {user, roles} = req.body;
		console.log(roles);
		if (!isValidRoles(roles)) return res.send(400).send('Bad Request');

		const dbUser = await User.findById(user);
		if (!dbUser) return res.status(404).send('Invalid user');

		dbUser.setRoles(roles);
		await dbUser.save();

		res.status(200).send(dbUser);
	},
);

// Get my info
router.get(
	'/me',
	async (...req) =>
		request(...req, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;
		res.status(200).send({
			name: req.user.name,
			email: req.user.email,
			id: req.user.id,
		});
	},
);

export default router;
