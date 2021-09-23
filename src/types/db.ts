import {Document, Query, SaveOptions} from 'mongoose';

/**
 * @description A user
 * @param {string} email The user's email
 * @param {string} id The user's id on Google
 * @param {string} name The user's name from Google
 * @param {string} tokens The user's OAuth tokens
 * @param {roles} number The user's roles (bitfield)
 */
export interface IUser {
	email: string | null;
	id: string;
	name: string | null;
	/**
	 * @param {string} refresh OAuth refresh token
	 * @param {string} access OAuth access token
	 * @param {Date} expires OAuth access token expiration date
	 * @param {string} session Session token
	 */
	tokens: {
		refresh: string | null;
		access: string | null;
		expires: Date | null;
		session: string | null;
	};
	roles: number;
	/**
	 * Get the user's balance
	 * @returns The user's balance
	 */
	getBalance(): Promise<number>;
	/**
	 * Set the roles on this user
	 * @param roles An array of roles to set
	 */
	setRoles(roles: UserRoleTypes[]): void;
	/**
	 * Check if the user has a role
	 * @param role The role to check for
	 */
	hasRole(role: UserRoleTypes): boolean;
	/**
	 * Check if the user has any of the specified roles
	 * @param role The roles to check for
	 */
	hasAnyRole(roles: UserRoleTypes[]): boolean;
	/**
	 * Check if the user has all of the specified roles
	 * @param role The roles to check for
	 */
	hasAllRoles(roles: UserRoleTypes[]): boolean;
}

export type IUserDoc = IUser &
	Omit<
		Omit<Document<IUser>, 'save'> & {
			save: (options?: SaveOptions | undefined) => Promise<IUserDoc>;
		},
		'id'
	>;
export type IUserQuery = Query<IUserDoc, IUserDoc> & IUserQueries;

export interface IUserQueries {
	byId(id: string): IUserQuery;
	byEmail(email: string): IUserQuery;
	byToken(token: string): IUserQuery;
}

/**
 * @description A transaction of kitcoin
 * @param {number} amount The amount of the transaction
 * @param {string} [reason] The reason of the transaction
 * @param {string} user Who the transition applies to
 * @param {string} owner The ID of the user who performed the transaction
 * @param {number} balance The balance of the user after the transaction
 * @param {Date} date The date of the transaction
 */
export interface ITransaction {
	amount: number;
	reason: string | null;
	user: string;
	owner: string;
	balance: number;
	date: Date;
}

export type ITransactionDoc = ITransaction & Document<ITransaction>;

export enum UserRoles {
	NONE = 0,
	STUDENT = 0b0010,
	STAFF = 0b0100,
	ADMIN = 0b1000,
	ALL = STUDENT | STAFF | ADMIN,
}

export type UserRoleTypes = keyof typeof UserRoles;

export function isValidRole(role: unknown): role is UserRoleTypes {
	if (Array.isArray(role)) return role.every(isValidRole);
	return typeof role === 'string' && Object.keys(UserRoles).includes(role);
}

export function isValidRoles(roles: unknown): roles is UserRoleTypes[] {
	if (!Array.isArray(roles)) return false;
	return roles.every(isValidRole);
}
