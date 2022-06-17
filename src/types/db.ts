import {FilterQuery, LeanDocument, Query} from 'mongoose';
import {Callback, FuzzyQuery, Search} from 'mongoose-fuzzy-searching';

import {IStore, IStoreRequest, ITransaction, IUser} from '../struct/index.js';
import {isValidEnumValue, isValidEnumValueArray, Modify} from './index.js';

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
	STUDENT = 0b00010,
	STAFF = 0b00100,
	ADMIN = 0b01000,
	BULK_SEND = 0b10000,
	ALL = STUDENT | STAFF | ADMIN | BULK_SEND,
}

export type UserRoleTypes = keyof typeof UserRoles;

export const isValidRole = (role: unknown): role is UserRoleTypes =>
	isValidEnumValue(UserRoles, role);
export const isValidRoles = (roles: unknown): roles is UserRoleTypes[] =>
	isValidEnumValueArray(UserRoles, roles);

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
		_id: string;
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
		users?: {
			name: string;
			id: string;
		}[];
		managers?: {
			name: string;
			id: string;
		}[];
		owner?: {
			name: string;
			id: string;
		};
	}
>;

export enum StoreRequestStatus {
	PENDING = 0,
	APPROVED = 1,
	DENIED = 2,
	CANCELLED = 3,
}

export type IStoreRequestAPIResponse = Modify<
	LeanDocument<IStoreRequest>,
	{
		date: string;
		store: {
			name: string;
			id: string;
		};
		item: {
			name: string;
			id: string;
		};
		student: {
			name: string;
			id: string;
		};
		status: string;
	},
	'storeID' | 'itemID' | 'studentID'
>;
