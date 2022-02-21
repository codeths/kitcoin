import {Document, Model, Query, FilterQuery, LeanDocument} from 'mongoose';
import {FuzzyQuery, Search, Callback} from 'mongoose-fuzzy-searching';
import express from 'express';
import {ErrorDetail, IUser, ITransaction, IStore, IStoreItem} from '../struct';
import {Modify} from '.';

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

/* NEW */

export abstract class MongooseFuzzyClass {
	public static fuzzySearch:
		| (<T extends MongooseFuzzyClass, QueryHelpers = {}>(
				query: Search,
				additionalQuery?: FilterQuery<T>,
				callback?: Callback<FuzzyQuery<T>, QueryHelpers>,
		  ) => Query<FuzzyQuery<T>[], FuzzyQuery<T>, QueryHelpers>)
		| (<T extends MongooseFuzzyClass, QueryHelpers = {}>(
				query: Search,
				callback?: Callback<FuzzyQuery<T>, QueryHelpers>,
		  ) => Query<FuzzyQuery<T>[], FuzzyQuery<T>, QueryHelpers>);
}

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

export type IUserAPIResponse = Modify<
	LeanDocument<IUser>,
	{
		roles: UserRoleTypes[];
		authorized?: boolean;
		scopes: string[];
	},
	'tokens'
>;

export type ITransactionAPIResponse = Modify<
	LeanDocument<ITransaction>,
	{
		/**
		 * The date of the transaction (ISO format)
		 */
		date: string;
		from: {
			/**
			 * The user's id
			 */
			id?: string;
			/**
			 * Text to display (for non-user transactions)
			 */
			text?: string;
			/**
			 * Is from current user
			 */
			me?: boolean;
		};
		to: {
			/**
			 * The user's id
			 */
			id?: string;
			/**
			 * Text to display (for non-user transactions)
			 */
			text?: string;
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

export type IStoreAPIResponse = Modify<
	LeanDocument<IStore>,
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

export {IUser, ITransaction, IStore, IStoreItem};
