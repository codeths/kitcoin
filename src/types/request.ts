import express from 'express';
import {IUserDoc, UserRoleTypes} from '.';

/**
 * Options for request handling
 * @param [authentication=false] Is authentication required
 * @param [roles=["NONE"]] Roles required to make the request
 */
export interface RequestOptions {
	authentication: boolean;
	roles: UserRoleTypes[];
}

const defaultOptions: RequestOptions = {
	authentication: false,
	roles: ['NONE'],
};

export function getOptions(
	options: Partial<RequestOptions> = {},
): RequestOptions {
	Object.keys(options).forEach(key => {});

	for (let key of Object.keys(options) as (keyof RequestOptions)[]) {
		if (options[key] == undefined) delete options[key];
	}

	return {
		...defaultOptions,
		...options,
	};
}

export interface AuthenticatedRequest extends express.Request {
	user: IUserDoc;
}

export type RequestValidateParts = 'query' | 'params' | 'body';

export type RequestValidateKeyFunction = (value: unknown) => boolean | string;
export type RequestValidateKeyOptions = {
	run: RequestValidateKeyFunction;
	errorMessage?: string;
};
export type RequestValidateKeyOptionsResolvable =
	| RequestValidateKeyOptions
	| (() => RequestValidateKeyOptions);

export type RequestValidateOptions = {
	[key in RequestValidateParts]?:
		| {
				[key: string]: RequestValidateKeyOptionsResolvable;
		  }
		| undefined;
};
