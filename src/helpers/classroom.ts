import Google, {google} from 'googleapis';

import {IUser, User} from '../struct/index.js';
import {ClassroomRoles, notEmpty} from '../types/index.js';
import {getAccessToken} from './oauth.js';

type Client = Google.Common.OAuth2Client;

class ClassroomClient {
	public client?: Client;

	/**
	 * Use an existing OAuth client
	 * @param client Google OAuth client
	 */
	public setClient(client: Client): this {
		this.client = client;

		return this;
	}

	/**
	 * Create an OAuth client
	 * @param user DB user
	 */
	public async createClient(user: IUser): Promise<this> {
		const client = await getAccessToken(user);
		if (client) this.client = client;

		return this;
	}

	/**
	 * Get a list of classes
	 * @param options Request options
	 */
	public async getClasses(
		options: Google.classroom_v1.Params$Resource$Courses$List | null = {},
	) {
		if (!this.client) return null;

		options = {
			courseStates: ['ACTIVE'],
			...options,
		};

		try {
			const classes: Google.Common.GaxiosResponse<Google.classroom_v1.Schema$ListCoursesResponse> | null =
				await google
					.classroom({version: 'v1', auth: this.client})
					.courses.list(options)
					.catch(e => null);

			if (!classes || !classes.data || !classes.data.courses) return null;

			return classes.data.courses;
		} catch (e) {
			return null;
		}
	}

	/**
	 * Get a list of classes with a specific role
	 * @param role Role the user must have
	 * @param options Request options
	 */
	public async getClassesForRole(
		role: ClassroomRoles,
		options: Google.classroom_v1.Params$Resource$Courses$List | null = {},
	) {
		if (!options) options = {};

		if (role == 'STUDENT') options.studentId = 'me';
		if (role == 'TEACHER') options.teacherId = 'me';

		return this.getClasses(options);
	}

	/**
	 * Get class info
	 * @param courseID Course ID
	 */
	public async getClass(courseID: string) {
		if (!this.client) return null;
		try {
			const classInfo = await google
				.classroom({version: 'v1', auth: this.client})
				.courses.get({id: courseID})
				.catch(e => null);

			if (!classInfo || !classInfo.data) return null;

			return classInfo.data;
		} catch (e) {
			return null;
		}
	}

	/**
	 * Get a list of students in a class
	 * @param courseID Course ID
	 */
	public async getStudents(courseID: string, pageToken?: string) {
		if (!this.client) return null;
		try {
			const students = await google
				.classroom({version: 'v1', auth: this.client})
				.courses.students.list({
					courseId: courseID,
					...(pageToken && {pageToken}),
				})
				.catch(e => null);

			if (!students) return null;
			if (!students.data || !students.data.students) return [];

			let allStudents = students.data.students;
			if (students.data.nextPageToken) {
				const newStudents = await this.getStudents(
					courseID,
					students.data.nextPageToken,
				);
				if (newStudents) allStudents.push(...newStudents);
			}

			return allStudents.filter(notEmpty);
		} catch (e) {
			return null;
		}
	}

	/**
	 * Get a list of students in their class along with their ID in the database (and create them if they don't exist)
	 * @param courseID Course ID
	 */
	public async getStudentsWithIds(courseID: string) {
		const students = await this.getStudents(courseID);
		if (!students) return null;

		const data = students.filter(x => x.userId) as (Omit<
			Google.classroom_v1.Schema$Student,
			'userId'
		> & {
			userId: string;
			mongoId: string;
		})[];

		const dataWithIDs = (
			await Promise.all(
				data.map(async student => {
					let user: IUser | null = await User.findByGoogleId(
						student.userId,
					);
					if (!user)
						user = await new User({
							googleID: student.userId,
							name: student.profile?.name?.fullName,
						})
							.save()
							.catch(e => null);
					if (!user) return null;
					student.mongoId = user.id;
					return student;
				}),
			)
		).filter(notEmpty);

		return dataWithIDs;
	}
}

export {ClassroomClient};
