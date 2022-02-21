import express from 'express';
import {IUser, UserRoleTypes} from '.';

/**
 * Options for request handling
 * @param [authentication=false] Is authentication required
 * @param [roles=["NONE"]] Roles required to make the request
 */
export interface RequestOptions {
	authentication: boolean;
	roles: UserRoleTypes[];
	validators: RequestValidateOptions;
}

const defaultOptions: RequestOptions = {
	authentication: false,
	roles: ['NONE'],
	validators: {},
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
	user: IUser;
}

export type RequestValidateParts = 'query' | 'params' | 'body';

export type RequestValidateKeyFunction = (value: unknown) => boolean | string;
export type RequestValidateKeyOptions = {
	run: RequestValidateKeyFunction;
	errorMessage?: string;
};
export type RequestValidateKeyOptionsResolvable =
	| RequestValidateKeyOptions
	| (() => RequestValidateKeyOptionsResolvable);

export type RequestValidateOptions = {
	[key in RequestValidateParts]?:
		| {
				[key: string]: RequestValidateKeyOptionsResolvable;
		  }
		| undefined;
};

export function requestHasUser(req: express.Request): req is express.Request & {
	user: IUser;
} {
	return (req.user! as IUser | undefined) != undefined;
}
