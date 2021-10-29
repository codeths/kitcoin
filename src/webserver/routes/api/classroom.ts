import express from 'express';
import {IUserDoc, User} from '../../../helpers/schema';
import {request} from '../../../helpers/request';
import Google, {google} from 'googleapis';
import {getAccessToken} from '../../../helpers/oauth';
import {ClassroomClient} from '../../../helpers/classroom';
import {isValidClassroomRole} from '../../../types';
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
		const role = req.query?.role ?? 'ANY';
		let teaching =
			typeof req.query?.role == 'string' && req.query?.role.toUpperCase();
		if (!teaching || !isValidClassroomRole(teaching))
			return res.status(400).send('Bad Request');

		const classroomClient = await new ClassroomClient().createClient(
			req.user,
		);
		if (!classroomClient.client)
			return res.status(403).send('Failed to authorize with Google');
		const classes = await classroomClient.getClassesForRole(teaching);

		res.status(200).send(
			(classes || [])
				.map(c => ({
					id: c.id,
					name: c.name,
					section: c.section,
				}))
				.filter(x => x.id),
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

		const classroomClient = await new ClassroomClient().createClient(
			req.user,
		);
		if (!classroomClient.client)
			return res.status(403).send('Failed to authorize with Google');
		const students = await classroomClient.getStudentsWithIds(
			req.params.class,
		);

		res.status(200).send(
			(students || []).map(s => ({
				googleId: s.userId,
				id: s.mongoId,
				name: s.profile?.name?.fullName,
			})),
		);
	},
);

export default router;
