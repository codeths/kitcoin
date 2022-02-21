import mongoose from 'mongoose';
import {mongo as mongoURL, weeklyBalance} from '../config/keys.json';
import {
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

const DBError = mongoose.model<IErrorDoc, IErrorModel>('Error', errorSchema);

export {DBError};
export * from '../types';
