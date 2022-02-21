import {getModelForClass, DocumentType} from '@typegoose/typegoose';
import UserClass from './user';
import TransactionClass from './transaction';

export const User = getModelForClass(UserClass);
export type IUser = DocumentType<UserClass>;

export const Transaction = getModelForClass(TransactionClass);
export type ITransaction = DocumentType<TransactionClass>;
