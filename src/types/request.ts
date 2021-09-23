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
	return {
		...defaultOptions,
		...options,
	};
}

export interface AuthenticatedRequest extends express.Request {
	user: IUserDoc;
}
