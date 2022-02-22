import {getModelForClass, DocumentType} from '@typegoose/typegoose';
import UserClass from './user';
import TransactionClass from './transaction';
import StoreClass from './store';
import StoreItemClass from './storeitem';
import DBErrorClass, {ErrorDetail} from './error';

export const User = getModelForClass(UserClass);
export type IUser = DocumentType<UserClass>;

export const Transaction = getModelForClass(TransactionClass);
export type ITransaction = DocumentType<TransactionClass>;

export const Store = getModelForClass(StoreClass);
export type IStore = DocumentType<StoreClass>;

export const StoreItem = getModelForClass(StoreItemClass);
export type IStoreItem = DocumentType<StoreItemClass>;

export const DBError = getModelForClass(DBErrorClass);
export type IDBError = DocumentType<DBErrorClass>;
export {ErrorDetail};
