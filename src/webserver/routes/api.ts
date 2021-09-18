import express from 'express';
import {User, Transaction, IUserDoc} from '../../helpers/schema';
import {getOAuth2Client, getAccessToken} from '../../helpers/oauth';
import {google} from 'googleapis';
const router = express.Router();

declare module 'express-serve-static-core' {
	interface Request {
		user: IUserDoc;
	}
}

router.use(async (req, res, next) => {
	if (!req.session?.token) return res.status(401).send('Unauthorized');
	const user = await User.findOne({'tokens.session': req.session.token});
	if (user) {
		req.user = user;
	} else {
		return res.status(401).send('Unauthorized');
	}
	next();
});

// Get user transactions
router.get('/transactions', async (req, res) => {
	try {
		let {user, count = 10} = req.query;
		if (typeof count == 'string') count = parseInt(count);
		if (
			typeof user !== 'string' ||
			typeof count !== 'number' ||
			isNaN(count)
		)
			return res.status(400).send('Bad Request');

		const dbUser = await User.findOne({_id: user});
		if (!dbUser) return res.status(404).send('Invalid user');

		const transactions = await Transaction.find({user: dbUser._id}, null, {
			sort: {
				date: -1,
			},
			limit: count,
		});

		res.status(200).send(transactions);
	} catch (e) {
		res.status(500).send('An error occured.');
	}
});

// Get user balance
router.get('/balance', async (req, res) => {
	try {
		const {user} = req.query;
		if (typeof user !== 'string')
			return res.status(400).send('Bad Request');

		const dbUser = await User.findOne({_id: user});
		if (!dbUser) return res.status(404).send('Invalid user');

		const transaction = await Transaction.findOne(
			{user: dbUser._id},
			null,
			{
				sort: {
					date: -1,
				},
			},
		);

		res.status(200).send({balance: transaction ? transaction.balance : 0});
	} catch (e) {
		res.status(500).send('An error occured.');
	}
});

// CURRENTLY DOES NOT WORK DUE TO ORGANIZATION PERMISSIONS (https://support.google.com/a/answer/6343701)
router.get('/search', async (req, res) => {
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
router.get('/classes', async (req, res) => {
	const client = await getAccessToken(req.user);
	if (!client) return res.status(401).send('Google authentication failed.');

	const classes = await google
		.classroom({version: 'v1', auth: client})
		.courses.list({teacherId: 'me'})
		.catch(e => null);
	if (!classes) return res.status(500).send('An error occured.');
	if (!classes.data || !classes.data.courses) return res.status(200).send([]);
	res.status(200).send(
		classes.data.courses
			.map(c => ({
				id: c.id,
				name: c.name,
				section: c.section,
			}))
			.filter(x => x.id && true),
	);
});

// Get students in class
router.get('/students', async (req, res) => {
	if (!req.query.class || typeof req.query.class !== 'string')
		return res.status(400).send('Bad Request');
	const client = await getAccessToken(req.user);
	if (!client) return res.status(401).send('Google authentication failed.');

	const students = await google
		.classroom({version: 'v1', auth: client})
		.courses.students.list({courseId: req.query.class, pageSize: 1000})
		.catch(e => null);

	if (!students) return res.status(500).send('An error occured.');
	if (!students.data || !students.data.students)
		return res.status(200).send([]);
	res.status(200).send(
		students.data.students
			.map(s => ({
				id: s.userId,
				name: s.profile?.name?.fullName,
			}))
			.filter(x => x.id && true),
	);
});

// Create transaction
router.post('/transactions', async (req, res) => {
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

		const dbUser = await User.findOne({_id: user});
		if (!dbUser) return res.status(404).send('Invalid user');

		const lastTransaction = await Transaction.findOne(
			{user: dbUser._id},
			null,
			{
				sort: {
					date: -1,
				},
			},
		);
		const oldBalance = lastTransaction ? lastTransaction.balance : 0;

		const transaction = await new Transaction({
			amount,
			reason: reason || null,
			user: dbUser._id,
			owner: req.user._id,
			balance: oldBalance + amount,
		}).save();

		res.status(200).send(transaction);
	} catch (e) {
		res.status(500).send('An error occured.');
	}
});

export default router;
