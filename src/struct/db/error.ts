import express from 'express';
import {customAlphabet} from 'nanoid';

import typegoose, {DocumentType} from '@typegoose/typegoose';
const {prop} = typegoose;
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

const nanoid = customAlphabet('ABCDEF0123456789', 6);

class ErrorDetailButton {
	@prop()
	public text: string;
	@prop()
	public url: string;
}

class IErrorDetail {
	public code?: number;
	public title?: string;
	public description?: string;
	public button?: ErrorDetailButton;
}

export class ErrorDetail {
	/**
	 * HTTP error code
	 */
	@prop()
	public code?: number;
	@prop()
	public title?: string;
	@prop()
	public description?: string;
	@prop({type: ErrorDetailButton})
	public button?: ErrorDetailButton;

	/**
	 * Create a new ErrorDetail with the same data
	 * @param data Partial data to apply
	 */
	public clone(data: Partial<IErrorDetail> = {}) {
		return this.edit(data, new ErrorDetail());
	}

	/**
	 * Edit the details
	 * @param data Partial data to apply
	 * @param classToModify Class to modify
	 */
	public edit(
		data: Partial<IErrorDetail>,
		classToModify: ErrorDetail = this,
	) {
		let originalData = {
			code: this.code,
			title: this.title,
			description: this.description,
			button: this.button,
		};

		let computedData = Object.assign(originalData, data);

		classToModify.code = computedData.code;
		classToModify.title = computedData.title;
		classToModify.description = computedData.description;
		classToModify.button = computedData.button;

		return classToModify;
	}

	public toJSON(): IErrorDetail {
		return {
			code: this.code,
			title: this.title,
			description: this.description,
			button: this.button,
		};
	}

	/**
	 * Create a new ErrorDetail with the same data
	 * @param data Data to apply
	 */
	public static create(data: IErrorDetail) {
		return new ErrorDetail().edit(data);
	}

	static readonly ERROR = ErrorDetail.create({
		title: 'Something went wrong',
		description: 'If this problem persists, please contact us.',
	});

	static readonly ERROR_WITH_ID = ErrorDetail.create({
		code: 500,
		title: 'Something went wrong',
		description:
			'If this problem persists, please contact us and share this error ID: {CODE}',
	});

	static readonly OAUTH_SIGN_IN_FAILED = ErrorDetail.create({
		title: 'Failed to sign in',
		description:
			'Please try again. If the problem persists, please contact us.',
		button: {
			text: 'Sign In Again',
			url: '/login',
		},
	});
}

export class ErrorError {
	@prop()
	public name?: string;
	@prop({required: true})
	public message!: string;
	@prop({type: [String]})
	public stack?: string[];
}

export class ErrorRequest {
	@prop({required: true})
	method!: string;
	@prop({required: true})
	url!: string;
	@prop()
	body?: string;
}

export default class DBError {
	@prop({default: () => nanoid()})
	public _id!: string;

	/**
	 * User ID (Mongo ID)
	 */
	@prop()
	public user?: string;

	/**
	 * When the error occured
	 */
	@prop({required: true, default: () => new Date()})
	public date!: Date;

	@prop({type: ErrorError})
	error?: ErrorError;

	/**
	 * Request
	 */
	@prop({type: ErrorRequest})
	request?: ErrorRequest;

	/**
	 * Details to show to user on webpage
	 */
	@prop({type: ErrorDetail})
	public details?: ErrorDetail;

	public static async generate(
		this: ReturnModelType<typeof DBError>,
		data: {
			error?: Error;
			request?: express.Request;
			details?: ErrorDetail | IErrorDetail;
		},
		additionalData: Partial<DBError> = {},
	): Promise<DocumentType<DBError>> {
		let output = additionalData;
		if (data.error) {
			output.error = {
				name: data.error.name,
				message: data.error.message,
				stack: (data.error.stack || '').split('\n'),
			};
		}
		if (data.details)
			output.details = ErrorDetail.create(
				data.details instanceof ErrorDetail
					? data.details.toJSON()
					: data.details,
			);

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

		return new this(output).save();
	}
}
