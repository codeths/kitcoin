import mongoose from 'mongoose';
import {mongo as mongoURL} from '../config/keys.json';
import {
	IUserQueries,
	UserRoles,
	UserRoleTypes,
	ITransactionAPIResponse,
	ITransactionDoc,
	IUserDoc,
	IUserModel,
	ITransactionModel,
} from '../types';

mongoose.connect(mongoURL);

const userSchema = new mongoose.Schema<IUserDoc, IUserModel>({
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

const transactionSchema = new mongoose.Schema<
	ITransactionDoc,
	ITransactionModel
>({
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

transactionSchema.methods.getUserText = async function (
	which: 'FROM' | 'TO',
): Promise<string | null> {
	let data = which === 'FROM' ? this.from : this.to;

	return (
		data.text || (data._id && (await User.findById(data._id))?.name) || null
	);
};

transactionSchema.methods.toAPIResponse =
	async function (): Promise<ITransactionAPIResponse> {
		return {
			amount: this.amount,
			reason: this.reason,
			from: await this.getUserText('FROM'),
			to: await this.getUserText('TO'),
			date: this.date.toISOString(),
		};
	};

const User = mongoose.model<IUserDoc, IUserModel>('User', userSchema);
const Transaction = mongoose.model<ITransactionDoc, ITransactionModel>(
	'Transaction',
	transactionSchema,
);

export {User, Transaction};
export * from '../types';
