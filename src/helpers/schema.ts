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
	ITransactionQueries,
} from '../types';

mongoose.connect(mongoURL);

const userSchema = new mongoose.Schema<IUserDoc, IUserModel>({
	email: String,
	googleID: {
		type: String,
		required: true,
	},
	name: {
		type: String,
	},
	balance: {
		type: Number,
		default: 0,
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
	roles: {type: Number, default: UserRoles.STUDENT},
});

userSchema.index({email: 1});
userSchema.index({googleID: 1}, {unique: true});

userSchema.query.byEmail = function (email: string): IUserQueries {
	return this.findOne({email});
};

userSchema.query.byId = function (googleID: string): IUserQueries {
	return this.findOne({googleID});
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
		id: String,
		text: String,
	},
	to: {
		id: String,
		text: String,
	},
	date: {
		type: Date,
		default: () => new Date(),
	},
});

transactionSchema.query.byUser = function (
	id: string,
	count?: number,
	page?: number,
): ITransactionQueries {
	count ??= 10;
	page ??= 1;

	return this.find({$or: [{'from.id': id}, {'to.id': id}]}, null, {
		sort: {
			date: -1,
		},
		limit: count,
		skip: count * (page - 1),
	});
};

transactionSchema.index({user: -1});

transactionSchema.methods.getUserText = async function (
	which: 'FROM' | 'TO',
): Promise<string | null> {
	let data = which === 'FROM' ? this.from : this.to;

	return (
		data.text || (data.id && (await User.findById(data.id))?.name) || null
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
