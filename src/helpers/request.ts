import express from 'express';
import {
	notEmpty,
	getOptions,
	RequestOptions,
	RequestValidateOptions,
	RequestValidateParts,
	RequestValidateKeyOptions,
	RequestValidateKeyOptionsResolvable,
} from '../types';
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

	// Loop through each request part (body, query, params, etc.)
	for (let partKey of partKeys) {
		const part = options[partKey] || {};
		const data: {[key: string]: unknown} = req[partKey] || {};

		if (typeof data !== 'object')
			return res.status(400).send(`Request is missing ${partKey}`);

		const validatorKeys = Object.keys(data);

		// Loop through each key of the request data
		for (let key of validatorKeys) {
			// Value in request data
			const value = data[key];
			// Validator for the key
			const validatorOptions = part[key];

			// Resolve the validator
			const validator = validators.resolve(validatorOptions);

			// Run the validator
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

export function stringFromData(data: string): string;
export function stringFromData(data: unknown): string | null;
export function stringFromData(data: unknown): string | null {
	if (typeof data == 'string') return data;
	return null;
}

export function numberFromData(data: number | `${number}`): number;
export function numberFromData(data: unknown): number | null;
export function numberFromData(data: unknown): number | null {
	let number;
	if (validators.numberString().run(data))
		number = parseFloat(data as string);
	else if (validators.number().run(data)) number = data as number;
	else return null;

	if (isNaN(number)) return null;

	return number;
}

export class validators {
	static resolve = (
		validator: RequestValidateKeyOptionsResolvable,
	): RequestValidateKeyOptions => {
		if (typeof validator == 'function') return validator();
		return validator;
	};

	/** Data must be a string */
	static string = () => ({
		run: (data: unknown): data is string => typeof data === 'string',
		errorMessage: '{KEY} must be a string',
	});

	/**
	 * Data must be equal to a specified value
	 * @param value Value to compare to
	 */
	static streq = (value: string) => ({
		run: (data: unknown): boolean | string => {
			let isStr = this.string().run(data) as boolean;
			if (!isStr) return '{KEY} must be a string';
			return data == value;
		},
		errorMessage: `{KEY} must be equal to ${value}`,
	});

	/** Data must be a number */
	static number = () => ({
		run: (data: unknown): data is number => typeof data === 'number',
		errorMessage: '{KEY} must be a number',
	});

	/** Data must be a stringified number */
	static numberString = () => ({
		run: (data: unknown): data is `${number}` => {
			let isStr = this.string().run(data) as boolean;
			if (!isStr) return false;
			return !isNaN(parseFloat(data as string));
		},
		errorMessage: '{KEY} must be a stringified number',
	});

	/** Data must be an integer */
	static integer = () => ({
		run: (data: unknown): boolean | string => {
			if (!validators.numberString().run(data))
				return '{KEY} must be a number';
			return (numberFromData(data) as number) % 1 === 0;
		},
		errorMessage: '{KEY} must be an integer',
	});

	/** Data must be a boolean */
	static boolean = () => ({
		run: (data: unknown): data is boolean => typeof data === 'boolean',
		errorMessage: '{KEY} must be a boolean',
	});

	/**
	 * Data must be greater than a specified value
	 * @param value Value to compare to
	 */
	static gt = (value: number) => ({
		run: (data: unknown): boolean | string => {
			if (!validators.numberString().run(data))
				return '{KEY} must be a number';
			return numberFromData(data) > value;
		},
		errorMessage: `{KEY} must be greater than ${value}`,
	});

	/**
	 * Data must be less than a specified value
	 * @param value Value to compare to
	 */
	static lt = (value: number) => ({
		run: (data: unknown): boolean | string => {
			if (!validators.numberString().run(data))
				return '{KEY} must be a number';
			return numberFromData(data) < value;
		},
		errorMessage: `{KEY} must be less than ${value}`,
	});

	/**
	 * Data must be equal to a specified value
	 * @param value Value to compare to
	 */
	static eq = (value: number) => ({
		run: (data: unknown): boolean | string => {
			if (!validators.numberString().run(data))
				return '{KEY} must be a number';
			return numberFromData(data) === value;
		},
		errorMessage: `{KEY} must be equal to ${value}`,
	});

	/**
	 * Data must be greater than or equl to a specified value
	 * @param value Value to compare to
	 */
	static gte = (value: number) => ({
		run: (data: unknown): boolean | string =>
			this.gt(value).run(data) || this.eq(value).run(data),
		errorMessage: `{KEY} must be greater than or equal to ${value}`,
	});

	/**
	 * Data must be less than or equl to a specified value
	 * @param value Value to compare to
	 */
	static lte = (value: number) => ({
		run: (data: unknown): boolean | string =>
			this.lt(value).run(data) || this.eq(value).run(data),
		errorMessage: `{KEY} must be less than or equal to ${value}`,
	});

	/**
	 * All validators must pass
	 * @param validators Validators to run
	 */
	static and = (...validators: RequestValidateKeyOptionsResolvable[]) => ({
		run: (data: unknown): boolean | string => {
			let results: (string | boolean)[] = [];
			validators.forEach(validator => {
				let v = this.resolve(validator);
				let res = v.run(data);
				results.push(!res ? v.errorMessage || `{KEY} is invalid` : res);
			});
			if (results.every(x => x === true)) return true;
			return results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('\nAND ');
		},
	});

	/**
	 * At least one validator must pass
	 * @param validators Validators to run
	 */
	static or = (...validators: RequestValidateKeyOptionsResolvable[]) => ({
		run: (data: unknown): boolean | string => {
			let results: (string | boolean)[] = [];
			validators.forEach(validator => {
				let v = this.resolve(validator);
				let res = v.run(data);
				results.push(!res ? v.errorMessage || `{KEY} is invalid` : res);
			});
			if (results.some(x => x === true)) return true;
			return results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('\nOR ');
		},
	});

	/**
	 * Validator must fail
	 * @param validator Validator to run
	 */
	static not = (validator: RequestValidateKeyOptionsResolvable) => ({
		run: (data: unknown): boolean | string => {
			let v = this.resolve(validator);
			let res = v.run(data);
			if (res === true) return `NOT ${v.errorMessage}`;
			return true;
		},
	});

	/**
	 * Vaildator must not exist (null or undefined)
	 */
	static exists = () => ({
		run: (data: unknown): data is null | undefined =>
			data !== null && data !== undefined,
		errorMessage: '{KEY} must exist',
	});

	/**
	 * If data exists, validator must pass
	 * @param validator Validator to run
	 */
	static optional = (validator: RequestValidateKeyOptionsResolvable) => ({
		run: (data: unknown): boolean | string => {
			let v = this.resolve(validator);
			if (!this.exists().run(data)) return true;
			let res = v.run(data);
			if (!res)
				return (
					`OPTIONAL ${v.errorMessage}` || 'OPTIONAL {KEY} is invalid'
				);
			return res;
		},
	});
}
