import express from 'express';
import {notEmpty, RequestValidateKeyOptions} from '../types';
import {
	getOptions,
	RequestOptions,
	RequestValidateOptions,
	RequestValidateParts,
} from '../types/request';
import {User} from './schema';

export async function request(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	options?: Partial<RequestOptions>,
) {
	const appliedOptions = getOptions(options);
	if (req.session?.token) {
		const user = await User.findOne().byToken(req.session.token);
		if (user) req.user = user;
	}
	if (appliedOptions.authentication && !req.user)
		return res.status(401).send('Unauthorized');

	if (req.user) {
		if (!req.user.hasAnyRole(appliedOptions.roles))
			return res.status(403).send('Forbidden');
	}

	next();
}

export function validate(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	options: RequestValidateOptions,
) {
	let partKeys = (Object.keys(options) as RequestValidateParts[]).filter(x =>
		notEmpty(options[x]),
	);

	for (let partKey of partKeys) {
		const validators = options[partKey] || {};
		const data: {[key: string]: unknown} = req[partKey] || {};

		if (typeof data !== 'object')
			return res.status(400).send(`Request is missing ${partKey}`);

		const validatorKeys = Object.keys(data);

		for (let key of validatorKeys) {
			const value = data[key];
			const validatorOptions = validators[key];

			const validator = resolveValidator(validatorOptions);

			const valid = validator.run(value);
			const error = typeof valid == 'string' ? valid : null;
			if (error)
				return res
					.status(
						(typeof validatorOptions == 'object' &&
							validatorOptions.errorStatus) ||
							400,
					)
					.send(
						(
							error ||
							(typeof validatorOptions == 'object' &&
								validatorOptions.errorMessage) ||
							'Bad request'
						).replace(/{KEY}/g, `${key} in ${partKey}`),
					);
		}
	}

	next();
}

function numberFromData(data: unknown): number | false {
	let number;
	if (validators.numberString().run(data))
		number = parseFloat(data as string);
	else if (validators.number(data)) number = data as number;
	else return false;

	if (isNaN(number)) return false;

	return number;
}

function resolveValidator(
	validator: RequestValidateKeyOptions | (() => RequestValidateKeyOptions),
): RequestValidateKeyOptions {
	if (typeof validator == 'function') return validator();
	return validator;
}

export const validators: {
	[key: string]: (...options: any[]) => RequestValidateKeyOptions;
} = {
	string: () => ({
		run: (data: unknown): data is string => typeof data === 'string',
		errorMessage: '{KEY} must be a string',
	}),
	streq: (value: string) => ({
		run: (data: unknown) => {
			let isStr = validators.string().run(data) as boolean;
			if (!isStr) return '{KEY} must be a string';
			return data == value;
		},
		errorMessage: `{KEY} must be equal to ${value}`,
	}),
	number: () => ({
		run: (data: unknown): data is number => typeof data === 'number',
		errorMessage: '{KEY} must be a number',
	}),
	numberString: () => ({
		run: (data: unknown) => {
			let isStr = validators.string().run(data) as boolean;
			if (!isStr) return '{KEY} must be a string';
			return !isNaN(parseFloat(data as string));
		},
		errorMessage: '{KEY} must be a stringified number',
	}),
	integer: () => ({
		run: (data: unknown) => {
			let isNum = validators
				.number()
				.run(numberFromData(data)) as boolean;
			if (!isNum) return '{KEY} must be a number';
			return (numberFromData(data) as number) % 1 === 0;
		},
		errorMessage: '{KEY} must be an integer',
	}),
	boolean: () => ({
		run: (data: unknown): data is boolean => typeof data === 'boolean',
		errorMessage: '{KEY} must be a boolean',
	}),
	gt: (value: number = 0) => ({
		run: (data: unknown) => {
			let isNum = validators
				.number()
				.run(numberFromData(data)) as boolean;
			if (!isNum) return '{KEY} must be a number';
			return numberFromData(data) > value;
		},
		errorMessage: `{KEY} must be greater than ${value}`,
	}),
	lt: (value: number = 0) => ({
		run: (data: unknown) => {
			let isNum = validators
				.number()
				.run(numberFromData(data)) as boolean;
			if (!isNum) return '{KEY} must be a number';
			return numberFromData(data) < value;
		},
		errorMessage: `{KEY} must be less than ${value}`,
	}),
	eq: (value: number = 0) => ({
		run: (data: unknown) => {
			let isNum = validators
				.number()
				.run(numberFromData(data)) as boolean;
			if (!isNum) return '{KEY} must be a number';
			return numberFromData(data) === value;
		},
		errorMessage: `{KEY} must be equal to ${value}`,
	}),
	gte: (value: number = 0) => ({
		run: (data: unknown) =>
			validators.gt(value).run(data) || validators.eq(value).run(data),
		errorMessage: `{KEY} must be greater than or equal to ${value}`,
	}),
	lte: (value: number = 0) => ({
		run: (data: unknown) =>
			validators.lt(value).run(data) || validators.eq(value).run(data),
		errorMessage: `{KEY} must be less than or equal to ${value}`,
	}),
	and: (...validators: RequestValidateKeyOptions[]) => ({
		run: (data: unknown) => {
			let results: (string | boolean)[] = [];
			validators.forEach(validator => {
				let v = resolveValidator(validator);
				let res = v.run(data);
				results.push(!res ? v.errorMessage || `{KEY} is invalid` : res);
			});
			if (results.every(x => x === true)) return true;
			return results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('\nAND ');
		},
	}),
	or: (...validators: RequestValidateKeyOptions[]) => ({
		run: (data: unknown) => {
			let results: (string | boolean)[] = [];
			validators.forEach(validator => {
				let v = resolveValidator(validator);
				let res = v.run(data);
				results.push(!res ? v.errorMessage || `{KEY} is invalid` : res);
			});
			if (results.some(x => x === true)) return true;
			return results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('\nOR ');
		},
	}),
	not: (validator: RequestValidateKeyOptions) => ({
		run: (data: unknown) => {
			let v = resolveValidator(validator);
			let res = v.run(data);
			if (res === true) return `NOT ${v.errorMessage}`;
			return true;
		},
	}),
	exists: () => ({
		run: (data: unknown) => data !== null && data !== undefined,
		errorMessage: '{KEY} must exist',
	}),
	optional: (validator: RequestValidateKeyOptions) => ({
		run: (data: unknown) => {
			let v = resolveValidator(validator);
			if (!validators.exists().run(data)) return true;
			let res = v.run(data);
			if (!res)
				return (
					`OPTIONAL ${v.errorMessage}` || 'OPTIONAL {KEY} is invalid'
				);
			return res;
		},
	}),
};
