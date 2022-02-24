import typegoose, {DocumentType} from '@typegoose/typegoose';
const {getModelForClass} = typegoose;
import DBErrorClass, {ErrorDetail} from './error.js';
import StoreClass from './store.js';
import StoreItemClass from './storeitem.js';
import TransactionClass from './transaction.js';
import UserClass from './user.js';

export const User = getModelForClass(UserClass);
export type IUser = DocumentType<UserClass>;

export const Transaction = getModelForClass(TransactionClass);
export type ITransaction = DocumentType<TransactionClass>;

export const Store = getModelForClass(StoreClass);
export type IStore = DocumentType<StoreClass>;

export const StoreItem = getModelForClass(StoreItemClass);
export type IStoreItem = DocumentType<StoreItemClass>;

export const DBError = getModelForClass(DBErrorClass, {
	options: {
		customName: 'errors',
	},
});
export type IDBError = DocumentType<DBErrorClass>;
export {ErrorDetail};
