import mongoose from 'mongoose';
import {mongo as mongoURL} from '../config/keys.json';
import {
	IUser,
	IUserQueries,
	ITransaction,
	UserRoles,
	UserRoleTypes,
} from '../types';

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
	balance: Number,
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
	roles: Number,
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

userSchema.methods.setRoles = function (roles: UserRoleTypes[]): void {
	this.roles = roles.reduce((acc, role) => acc | UserRoles[role], 0);
	return;
};

userSchema.methods.hasRole = function (role: UserRoleTypes): boolean {
	return (this.roles & UserRoles[role]) === UserRoles[role];
};

userSchema.methods.hasAnyRole = function (roles: UserRoleTypes[]): boolean {
	return roles.some(role => this.hasRole(role));
};

userSchema.methods.hasAllRoles = function (roles: UserRoleTypes[]): boolean {
	return roles.every(role => this.hasRole(role));
};

const transactionSchema = new mongoose.Schema<ITransaction>({
	amount: {
		type: Number,
		required: true,
	},
	reason: String,
	from: {
		_id: String,
		text: String,
	},
	to: {
		_id: String,
		text: String,
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
