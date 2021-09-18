import { Document, Query } from 'mongoose';

/**
 * @description A user
 * @param {string} email The user's email
 * @param {string} id The user's id on Google
 * @param {string} name The user's name from Google
 * @param {string} tokens The user's OAuth tokens
 */
export interface IUser {
	email: string | null;
	id: string | null;
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
	getBalance(): Promise<number>;
}

export type IUserDoc = IUser & Document<IUser>;

export interface IUserQueries {
	byId(id: `${number}`): Query<any, IUserDoc> & IUserQueries;
	byEmail(email: string): Query<any, IUserDoc> & IUserQueries;
	byToken(token: string): Query<any, IUserDoc> & IUserQueries;
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