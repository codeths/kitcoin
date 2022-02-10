import {
	Callback,
	Document,
	Model,
	ObjectId,
	Query,
	SaveOptions,
} from 'mongoose';
import {MongooseFuzzyModel} from 'mongoose-fuzzy-searching';
import express from 'express';
import {ErrorDetail} from '../struct';
import {Modify} from '.';

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
	 * The user's school ID
	 */
	schoolID: string;
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
		/**
		 * Authorized scopes
		 */
		scopes: string[];
	};
	/**
	 * The user's balance
	 */
	balance: number;
	/**
	 * Staff - when their balance resets
	 */
	balanceExpires?: Date;
	/**
	 * Staff - multiplier for weekly balance
	 */
	weeklyBalanceMultiplier?: number;
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
	 * Get array of roles
	 */
	getRoles(): UserRoleTypes[];
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

export type IUserDoc = IUser & IUserMethods & Document<IUser>;

export type IUserQuery = Query<IUserDoc, IUserDoc> & IUserQueries;

export interface IUserQueries {
	byId(googleID: string): IUserQuery;
	bySchoolId(schoolID: string): IUserQuery;
	byEmail(email: string): IUserQuery;
	byToken(token: string): IUserQuery;
}

export type IUserModel = MongooseFuzzyModel<IUserDoc, IUserQueries>;

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
	 */
	from: {
		/**
		 * The user's id
		 */
		id: string | null;
		/**
		 * Text to display (for non-user transactions)
		 */
		text: string | null;
	};
	/**
	 * Who received this transaction
	 */
	to: {
		/**
		 * The user's id
		 */
		id: string | null;
		/**
		 * Text to display (for non-user transactions)
		 */
		text: string | null;
	};
	/**
	 * Store details (if applicable)
	 */
	store?: {
		/**
		 * The store's id
		 */
		id: string;
		/**
		 * The item's id
		 */
		item: string;
		/**
		 * The store manager's id (who created the transaction)
		 */
		manager: string;
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
	 * Get whether or not a user can manage this transaction
	 * @param user User to check
	 */
	canManage(user?: IUserDoc): boolean;
	/**
	 * Turn this transaction into a JSON object for API output
	 * @param user Current user's ID
	 */
	toAPIResponse(user?: IUserDoc): Promise<ITransactionAPIResponse>;
}

export type ITransactionAPIResponse = Modify<
	ITransaction,
	{
		/**
		 * The date of the transaction (ISO format)
		 */
		date: string;
		from: {
			/**
			 * The user's id
			 */
			id: string | null;
			/**
			 * Text to display (for non-user transactions)
			 */
			text: string | null;
			/**
			 * Is from current user
			 */
			me?: boolean;
		};
		to: {
			/**
			 * The user's id
			 */
			id: string | null;
			/**
			 * Text to display (for non-user transactions)
			 */
			text: string | null;
			/**
			 * Is to current user
			 */
			me?: boolean;
		};
		/**
		 * Can be managed by current user
		 */
		canManage: boolean;
	}
>;

export type ITransactionDoc = ITransaction &
	ITransactionMethods &
	Document<ITransaction>;

export type ITransactionQuery = Query<ITransactionDoc, ITransactionDoc> &
	IUserQueries;

export type ITransactionsQuery = Query<ITransactionDoc[], ITransactionDoc> &
	IUserQueries;

export interface ITransactionQueries {
	byUser(
		id: string,
		{
			count,
			page,
			search,
		}: {
			count: number | null;
			page: number | null;
			search: string | null;
		},
	): ITransactionsQuery;
}

export type ITransactionModel = Model<ITransactionDoc, ITransactionQueries>;

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

export interface IStore {
	name: string;
	description?: string;
	/**
	 * Google classroom ID (if applicable)
	 */
	classIDs: string[];
	/**
	 * Should the store be shown to everyone
	 */
	public: boolean;
	/**
	 * Mongo ID of the person who owns this store
	 */
	owner: string;
	/**
	 * Mongo IDs of users who can manage this store
	 */
	managers: string[];
	/**
	 * Mongo IDs of users who can view this store
	 */
	users: string[];
}

export type IStoreAPIResponse = Modify<
	IStore,
	{
		canManage: boolean;
		classIDs?: string[];
		classNames?: string[];
		owner?: string;
		users?: {
			name: string;
			id: string;
		}[];
		managers?: {
			name: string;
			id: string;
		}[];
	}
>;

export type IStoreDoc = IStore & IStoreMethods & Document<IStore>;

export type IStoreQuery = Query<IStoreDoc, IStoreDoc> & IStoreQueries;

export interface IStoreMethods {
	getItems(): Promise<IStoreItemDoc[]>;
	toAPIResponse(canManage: boolean): Promise<IStoreAPIResponse>;
}

export interface IStoreQueries {
	/**
	 * @param classCode Google classroom code
	 */
	byClassCode(classCode: string): IStoreQuery;
}

export type IStoreModel = Model<IStoreDoc, IStoreQueries>;

export interface IStoreItem {
	/**
	 * Which store the item is in (Mongo ID)
	 */
	storeID: string;
	/**
	 * Name of the store item
	 */
	name: string;
	quantity: number | null;
	/**
	 * Item description
	 */
	description?: string;
	price: number;
	/**
	 * Hash of the item's image
	 */
	imageHash: string | null;
}

export type IStoreItemDoc = IStoreItem &
	IStoreItemMethods &
	Document<IStoreItem>;

export type IStoreItemQuery = Query<IStoreItemDoc, IStoreItemDoc> &
	IStoreItemQueries;

export type IStoreItemsQuery = Query<IStoreItemDoc[], IStoreItemDoc> &
	IStoreItemQueries;

export interface IStoreItemMethods {
	getStore(): Promise<IStoreDoc | null>;
}

export interface IStoreItemQueries {
	/**
	 * @param storeID Store ID (Mongo ID)
	 */
	byStoreID(storeID: string): IStoreItemsQuery;
}

export interface IStoreItemModel
	extends Model<IStoreItemDoc, IStoreItemQueries> {}

export interface IErrorDetail {
	/**
	 * HTTP error code
	 */
	code?: number | null;
	title?: string | null;
	description?: string | null;
	button?: {
		text: string;
		url: string;
	} | null;
}

export interface IError {
	/**
	 * User ID (Mongo ID)
	 */
	user?: string;
	/**
	 * When the error occured
	 */
	date: Date;
	error?: {
		name?: string | null;
		message: string;
		stack?: string[] | null;
	} | null;
	/**
	 * Request
	 */
	request?: {
		method: string;
		url: string;
		body?: string | null;
	} | null;
	/**
	 * Details to show to user on webpage
	 */
	details?: IErrorDetail | null;
}

export interface IErrorStaticMethods {
	/**
	 * Generate error
	 */
	generate(
		/**
		 * Data to parse
		 */
		data: {
			error?: Error;
			request?: express.Request;
			details?: IErrorDetail | ErrorDetail;
		},
		/**
		 * Additional raw IError data
		 */
		additionalData?: Partial<IError>,
	): Promise<IErrorDoc>;
}

export type IErrorDoc = IError & Document<IError>;

export type IErrorModel = Model<IErrorDoc> & IErrorStaticMethods;
