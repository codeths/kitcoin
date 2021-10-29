import Google, {google} from 'googleapis';
import {IUserDoc, ClassroomRoles, notEmpty} from '../types';
import {getAccessToken} from './oauth';
import {User} from './schema';

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
	public async createClient(user: IUserDoc): Promise<this> {
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
		try {
			const classes = await google
				.classroom({version: 'v1', auth: this.client})
				.courses.list(options || {})
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
	 * Get a list of students in a class
	 * @param courseID Course ID
	 * @returns
	 */
	public async getStudents(courseID: string) {
		if (!this.client) return null;
		try {
			const students = await google
				.classroom({version: 'v1', auth: this.client})
				.courses.students.list({courseId: courseID, pageSize: 1000})
				.catch(e => null);

			if (!students || !students.data || !students.data.students)
				return null;

			return students.data.students.filter(notEmpty);
		} catch (e) {
			return null;
		}
	}

	/**
	 * Get a list of students in their class along with their ID in the database (and create them if they don't exist)
	 * @param courseID Course ID
	 * @returns
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
					let user: IUserDoc | null = await User.findOne().byId(
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
