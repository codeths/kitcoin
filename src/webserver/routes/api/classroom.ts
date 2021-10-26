import express from 'express';
import {IUserDoc, User} from '../../../helpers/schema';
import {request} from '../../../helpers/request';
import Google, {google} from 'googleapis';
import {getAccessToken} from '../../../helpers/oauth';
const router = express.Router();

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
		let teaching = req.query?.role || 'any';
		if (
			typeof teaching !== 'string' ||
			!['teacher', 'student', 'any'].includes(teaching)
		)
			return res.status(400).send('Bad Request');
		let apiOptions: Google.classroom_v1.Params$Resource$Courses$List = {};

		if (teaching == 'student') apiOptions.studentId = 'me';
		if (teaching == 'teacher') apiOptions.teacherId = 'me';

		const client = await getAccessToken(req.user);
		if (!client)
			return res.status(401).send('Google authentication failed.');

		const classes = await google
			.classroom({version: 'v1', auth: client})
			.courses.list(apiOptions)
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
				googleID: s.userId,
				name: s.profile?.name?.fullName,
			}))
			.filter(x => x.googleID && true) as {
			googleID: string;
			name: string | null;
			id: string | null;
		}[];

		const dataWithIDs = (
			await Promise.all(
				data.map(async student => {
					let user: IUserDoc | null = await User.findOne().byId(
						student.googleID,
					);
					if (!user)
						user = await new User({
							googleID: student.googleID,
							name: student.name,
						})
							.save()
							.catch(e => null);
					if (!user) return null;
					student.id = user.id;
					return student;
				}),
			)
		).filter(x => x && true) as {
			googleID: string;
			name: string | null;
			id: string | null;
		}[];

		res.status(200).send(data);
	},
);

export default router;
