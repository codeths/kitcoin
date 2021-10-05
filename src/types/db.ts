import {Document, Model, ObjectId, Query, SaveOptions} from 'mongoose';

export interface IUser {
	/**
	 * The user's email
	 */
	email: string | null;
	/**
	 * The user's Google ID
	 */
	googleID: string;
	/**
	 * The user's name
	 */
	name: string | null;
	tokens: {
		/**
		 * OAuth refresh token
		 */
		refresh: string | null;
		/**
		 * OAuth access token
		 */
		access: string | null;
		/**
		 * OAuth access token expiration date
		 */
		expires: Date | null;
		/**
		 * Session token
		 */
		session: string | null;
	};
	/**
	 * The user's balance
	 */
	balance: number;
	/**
	 * The user's roles (bitfield)
	 */
	roles: number;
}

export interface IUserMethods {
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
	IUserMethods &
	Omit<Document<IUser>, 'save'> & {
		save: (options?: SaveOptions | undefined) => Promise<IUserDoc>;
	};

export type IUserQuery = Query<IUserDoc, IUserDoc> & IUserQueries;

export interface IUserQueries {
	byId(googleID: string): IUserQuery;
	byEmail(email: string): IUserQuery;
	byToken(token: string): IUserQuery;
}

export interface IUserModel extends Model<IUserDoc, IUserQueries> {}

/**
 * @typedef TransactionUser
 * @property {} id The user's id
 * @property {} text Text to display (for non-user transactions)
 */

export interface ITransaction {
	/**
	 * The amount of the transaction
	 */
	amount: number;
	/**
	 * The reason of the transaction
	 */
	reason: string | null;
	/**
	 * Who sent this transaction
	 * @type {TransactionUser}
	 */
	from: {
		id: string | null;
		text: string | null;
	};
	/**
	 * Who received this transaction
	 * @type {TransactionUser}
	 */
	to: {
		id: string | null;
		text: string | null;
	};
	/**
	 * The date of the transaction
	 */
	date: Date;
}

export interface ITransactionMethods {
	/**
	 * Get the text of the users involved in this transaction
	 * @param which Which user to get the text of
	 */
	getUserText(which: 'FROM' | 'TO'): Promise<string | null>;
	/**
	 * Turn this transaction into a JSON object for API output
	 * @param user Current user's ID
	 */
	toAPIResponse(user?: string): Promise<ITransactionAPIResponse>;
}

export type ITransactionAPIResponse = Omit<ITransaction, 'date'> & {
	/**
	 * The date of the transaction (ISO format)
	 */
	date: string;
};

export type ITransactionDoc = ITransaction &
	ITransactionMethods &
	Omit<Document<ITransaction>, 'save'> & {
		save: (options?: SaveOptions | undefined) => Promise<ITransaction>;
	};

export type ITransactionQuery = Query<ITransactionDoc, ITransactionDoc> &
	IUserQueries;

export type ITransactionsQuery = Query<ITransactionDoc[], ITransactionDoc> &
	IUserQueries;

export interface ITransactionQueries {
	byUser(id: string, count?: number, page?: number): ITransactionsQuery;
}

export interface ITransactionModel
	extends Model<ITransactionDoc, ITransactionQueries> {}

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
