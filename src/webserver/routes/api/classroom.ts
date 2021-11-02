import express from 'express';
import {IUserDoc, User} from '../../../helpers/schema';
import {request, Validators} from '../../../helpers/request';
import Google, {google} from 'googleapis';
import {getAccessToken} from '../../../helpers/oauth';
import {ClassroomClient} from '../../../helpers/classroom';
import {ClassroomRolesArray, isValidClassroomRole} from '../../../types';
const router = express.Router();

// Get classes
router.get(
	'/classes',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				query: {
					role: Validators.optional(
						Validators.and(Validators.string, {
							run: role =>
								isValidClassroomRole(
									(role as string).toUpperCase(),
								),
							errorMessage: `{KEY} must be one of: ${ClassroomRolesArray.join(
								', ',
							)} (case insensitive)`,
						}),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!req.user) return;
			const role = req.query?.role ?? 'ANY';
			let teaching = typeof role == 'string' && role.toUpperCase();
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
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

// Get students in class
router.get(
	'/students/:class',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STAFF'],
			validators: {
				params: {
					class: Validators.string,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!req.user) return;

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

			if (!students)
				return res.status(500).send('Could not get students');

			res.status(200).send(
				students.map(s => ({
					googleId: s.userId,
					id: s.mongoId,
					name: s.profile?.name?.fullName,
				})),
			);
		} catch (e) {
			try {
				res.status(500).send('An error occured.');
			} catch (e) {}
		}
	},
);

export default router;
