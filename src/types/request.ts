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
