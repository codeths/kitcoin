import mongoose from 'mongoose';
import {mongo as mongoURL, weeklyBalance} from '../config/keys.json';
import {
	IStoreDoc,
	IStoreModel,
	IStoreQueries,
	IStoreItem,
	IStoreItemQueries,
	IStoreItemMethods,
	IStoreItemsQuery,
	IStoreItemDoc,
	IStoreItemModel,
	IErrorDoc,
	IErrorModel,
	IError,
	IErrorDetail,
	IStoreAPIResponse,
	IUserAPIResponse,
} from '../types';

import {customAlphabet} from 'nanoid';
const nanoid = customAlphabet('ABCDEF0123456789', 6);
import express from 'express';
import {ErrorDetail, User} from '../struct';

mongoose.connect(mongoURL);

const storeSchema = new mongoose.Schema<IStoreDoc, IStoreModel>({
	name: {type: String, required: true},
	description: String,
	classIDs: [String],
	public: {
		type: Boolean,
		default: false,
		required: true,
	},
	owner: String,
	managers: [String],
	users: [String],
});

storeSchema.query.byClassCode = function (classCode: string): IStoreQueries {
	return this.where({classIDs: classCode});
};

storeSchema.methods.getItems = async function (): Promise<IStoreItemDoc[]> {
	return await StoreItem.where({storeID: this.id});
};

storeSchema.methods.toAPIResponse = async function (
	this: IStoreDoc,
	canManage: boolean,
): Promise<IStoreAPIResponse> {
	let data = this.toObject({
		getters: true,
		versionKey: false,
	});
	delete data.id;

	if (!canManage) {
		let res: IStoreAPIResponse = {
			...data,
			users: undefined,
			managers: undefined,
			classIDs: undefined,
			owner: undefined,
			canManage,
		};
		return res;
	}

	let userData = await Promise.all(
		[this.users, this.managers, this.owner].flat().map(async id => {
			let user = await User.findById(id);
			return user ? {name: user.name || '', id} : {name: '', id};
		}),
	);

	let res: IStoreAPIResponse = {
		...data,
		users: data.users.map(id => userData.find(x => x.id == id)!),
		managers: data.managers.map(id => userData.find(x => x.id == id)!),
		canManage,
	};

	return res;
};

storeSchema.index({classIDs: 1});

const storeItemSchema = new mongoose.Schema<IStoreItemDoc, IStoreItemModel>({
	storeID: {type: String, required: true},
	name: {type: String, required: true},
	quantity: Number,
	description: {type: String, default: ''},
	price: Number,
	imageHash: String,
});

storeItemSchema.query.byStoreID = function (storeID: string): IStoreItemsQuery {
	return this.where({storeID});
};

storeItemSchema.methods.getStore =
	async function (): Promise<IStoreDoc | null> {
		return await Store.findById(this.storeID);
	};

storeItemSchema.index({storeID: 1});

const errorSchema = new mongoose.Schema<IErrorDoc, IErrorModel>({
	_id: {
		type: String,
		default: () => nanoid(),
	},
	date: {
		type: Date,
		default: () => new Date(),
	},
	user: String,
	error: {
		name: String,
		message: String,
		stack: [String],
	},
	request: {
		method: String,
		url: String,
		body: String,
	},
	details: {
		code: Number,
		title: String,
		description: String,
		button: {
			text: String,
			url: String,
		},
	},
});

errorSchema.statics.generate = async function (
	data: {
		error?: Error;
		request?: express.Request;
		details?: IErrorDetail | ErrorDetail;
	},
	additionalData: Partial<IError> = {},
): Promise<IErrorDoc> {
	let output = additionalData;
	if (data.error) {
		output.error = {
			name: data.error.name,
			message: data.error.message,
			stack: (data.error.stack || '').split('\n'),
		};
	}
	if (data.details)
		output.details =
			data.details instanceof ErrorDetail
				? data.details.toJSON()
				: data.details;

	if (!output.details)
		output.details = output.error
			? ErrorDetail.ERROR_WITH_ID
			: ErrorDetail.ERROR;

	if (data.request) {
		output.request = {
			method: data.request.method,
			url: `${data.request.protocol}://${data.request.get('host')}${
				data.request.originalUrl
			}`,
		};
		if (typeof data.request.body == 'object')
			output.request.body = JSON.stringify(data.request.body);
		if (typeof data.request.body == 'string') data.request.body;
	}

	return new DBError(output).save();
};

const Store = mongoose.model<IStoreDoc, IStoreModel>('Store', storeSchema);
const StoreItem = mongoose.model<IStoreItemDoc, IStoreItemModel>(
	'StoreItem',
	storeItemSchema,
);

const DBError = mongoose.model<IErrorDoc, IErrorModel>('Error', errorSchema);

export {Store, StoreItem, DBError};
export * from '../types';
