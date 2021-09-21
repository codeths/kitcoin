import mongoose from 'mongoose';
import {mongo as mongoURL} from '../config/keys.json';
import {IUser, IUserQueries, ITransaction} from '../types';

mongoose.connect(mongoURL);

const userSchema = new mongoose.Schema<IUser>({
	email: String,
	id: {
		type: String,
		required: true,
	},
	name: {
		type: String,
	},
	tokens: {
		refresh: {
			type: String,
			default: null,
		},
		access: {
			type: String,
			default: null,
		},
		expires: {
			type: Date,
			default: null,
		},
		session: {
			type: String,
			default: null,
		},
	},
});

userSchema.index({email: 1});
userSchema.index({id: 1}, {unique: true});

userSchema.query.byEmail = function (email: string): IUserQueries {
	return this.findOne({email});
};

userSchema.query.byId = function (id: string): IUserQueries {
	return this.findOne({id});
};

userSchema.query.byToken = function (token: string): IUserQueries {
	return this.findOne({'tokens.session': token});
};

userSchema.methods.getBalance = async function (): Promise<number> {
	const latestTransaction = await Transaction.findOne({user: this.id}, null, {
		sort: {
			date: -1,
		},
	});

	if (!latestTransaction) return 0;
	return latestTransaction.balance;
};

const transactionSchema = new mongoose.Schema<ITransaction>({
	amount: {
		type: Number,
		required: true,
	},
	reason: String,
	user: String,
	owner: String,
	balance: {
		type: Number,
		required: true,
	},
	date: {
		type: Date,
		default: () => new Date(),
	},
});

transactionSchema.index({user: -1});

const User = mongoose.model<IUser, mongoose.Model<IUser, IUserQueries>>(
	'User',
	userSchema,
);
const Transaction = mongoose.model<ITransaction>(
	'Transaction',
	transactionSchema,
);

export {User, Transaction};
export * from '../types';
