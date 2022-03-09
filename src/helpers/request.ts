import express from 'express';
import mongoose from 'mongoose';
const {isValidObjectId} = mongoose;

import {DBError, User} from '../struct/index.js';
import {
	getOptions,
	isValidRole,
	notEmpty,
	RequestOptions,
	RequestValidateKeyOptions,
	RequestValidateKeyOptionsResolvable,
	RequestValidateOptions,
	RequestValidateParts,
} from '../types/index.js';

export async function request(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	options?: Partial<RequestOptions>,
) {
	const appliedOptions = getOptions(options);
	if (req.session?.token) {
		const user = await User.findByToken(req.session.token);
		if (user) req.user = user;
	}
	if (appliedOptions.authentication && !req.user)
		return res.status(401).send('Unauthorized');

	if (req.user) {
		if (!req.user.hasAnyRole(appliedOptions.roles))
			return res.status(403).send('Forbidden');
	}

	try {
		const badRequest = validate(req, appliedOptions.validators);
		if (badRequest) return res.status(400).send(badRequest);
	} catch (e) {
		try {
			const error = await DBError.generate(
				{
					request: req,
					error: e instanceof Error ? e : undefined,
				},
				{
					user: req.user?.id,
				},
			);
			return res
				.status(500)
				.send(`Something went wrong. Error ID: ${error.id}`);
		} catch (e) {}
	}

	next();
}

export function validate(
	req: express.Request,
	options: RequestValidateOptions,
): string | null {
	let partKeys = (Object.keys(options) as RequestValidateParts[]).filter(x =>
		notEmpty(options[x]),
	);

	let errors: string[] = [];

	// Loop through each request part (body, query, params, etc.)
	for (let partKey of partKeys) {
		const part = options[partKey] || {};
		const data: {[key: string]: unknown} = req[partKey] || {};

		if (typeof data === 'object') {
			const validatorKeys = Object.keys(part);

			// Loop through each key of the request data
			for (let key of validatorKeys) {
				// Value in request data
				const value = data[key];
				// Validator for the key
				const validatorOptions = part[key];

				if (validatorOptions) {
					// Resolve the validator
					const validator = Validators.resolve(validatorOptions);

					// Run the validator
					const valid = validator.run(value);
					const error = typeof valid == 'string' ? valid : null;
					if (error || valid === false)
						errors.push(
							(
								error ||
								validator.errorMessage ||
								'{KEY} is invalid'
							).replace(/{KEY}/g, `${key} in ${partKey}`),
						);
				}
			}
		} else {
			errors.push(`Request is missing ${partKey}`);
		}
	}

	if (errors.length > 0) return errors.join('<br><br>');
	return null;
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
	if (Validators.numberString().run(data))
		number = parseFloat(data as string);
	else if (Validators.number().run(data)) number = data;
	else return null;

	if (isNaN(number)) return null;

	return number;
}

export function booleanFromData(data: boolean | `${boolean}`): boolean;
export function booleanFromData(data: unknown): boolean | null;
export function booleanFromData(data: unknown): boolean | null {
	let boolean: boolean | null = null;
	if (Validators.booleanString().run(data)) boolean = data === 'true';
	else if (Validators.boolean().run(data)) boolean = data;

	return boolean;
}

export function dateFromData(data: unknown): Date | null {
	if (!Validators.date().run(data)) return null;
	return new Date(data);
}

export class Validators {
	static resolve = (
		validator: RequestValidateKeyOptionsResolvable,
	): RequestValidateKeyOptions => {
		if (typeof validator !== 'function') return validator;
		validator = validator();
		return Validators.resolve(validator);
	};

	/** Data must be a string */
	static string = () => ({
		run: (data: unknown): data is string => typeof data === 'string',
		errorMessage: '{KEY} must be a string',
	});

	/**
	 * Data must be equal to a specified value or one of the specified values
	 * @param value Value to compare to
	 * @param caseSensitive Whether to compare case sensitively
	 */
	static streq = (
		value: string | string[],
		caseSensitive: boolean = true,
	) => ({
		run: (data: unknown): boolean | string => {
			if (!Validators.string().run(data)) return '{KEY} must be a string';
			if (!Array.isArray(value)) value = [value];
			if (!caseSensitive) {
				data = data.toLowerCase();
				value = value.map(x => x.toLowerCase());
			}
			return value.some(x => x == data);
		},
		errorMessage: `{KEY} must be equal to ${
			Array.isArray(value) ? `one of: ${value.join(',')}` : value
		} (case ${caseSensitive ? '' : 'in'}sensitive)`,
	});

	/**
	 * Data must be a non-empty string
	 */
	static stringNotEmpty = () => ({
		run: (data: unknown): boolean | string => {
			if (!Validators.string().run(data)) return '{KEY} must be a string';
			if (data.trim() == '') return '{KEY} must not be empty';
			return true;
		},
	});

	/**
	 * Data must match regex pattern
	 * @param value Regex pattern to match
	 */
	static regex = (value: RegExp) => ({
		run: (data: unknown): boolean | string => {
			if (!Validators.string().run(data)) return '{KEY} must be a string';
			return value.test(data as string);
		},
		errorMessage: `{KEY} must match ${value}`,
	});

	/** Data must be a number */
	static number = () => ({
		run: (data: unknown): data is number =>
			typeof data === 'number' && !isNaN(data) && isFinite(data),
		errorMessage: '{KEY} must be a number',
	});

	/** Data must be a stringified number */
	static numberString = () => ({
		run: (data: unknown): data is `${number}` => {
			if (!Validators.string().run(data)) return false;
			let num = parseFloat(data as string);
			return !isNaN(num) && isFinite(num);
		},
		errorMessage: '{KEY} must be a number',
	});

	/** Data must be a number or stringified number */
	static anyNumber = () => ({
		run: (data: unknown): data is number | `${number}` =>
			Validators.number().run(data) ||
			Validators.numberString().run(data),
		errorMessage: '{KEY} must be a number',
	});

	/** Data must be an integer */
	static integer = () => ({
		run: (data: unknown): boolean | string => {
			if (!Validators.anyNumber().run(data))
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

	/** Data must be a stringified boolean */
	static booleanString = () => ({
		run: (data: unknown): data is `${boolean}` =>
			(Validators.string().run(data) &&
				Validators.streq(['true', 'false']).run(data)) === true,
		errorMessage: '{KEY} must be a boolean',
	});

	/** Data must be a boolean or stringified boolean */
	static anyBoolean = () => ({
		run: (data: unknown): data is boolean | `${boolean}` =>
			Validators.boolean().run(data) ||
			Validators.booleanString().run(data),
		errorMessage: '{KEY} must be a boolean',
	});

	/**
	 * Data must be greater than a specified value
	 * @param value Value to compare to
	 */
	static gt = (value: number) => ({
		run: (data: unknown): boolean | string => {
			if (!Validators.anyNumber().run(data))
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
			if (!Validators.anyNumber().run(data))
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
			if (!Validators.anyNumber().run(data))
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
			Validators.gt(value).run(data) || Validators.eq(value).run(data),
		errorMessage: `{KEY} must be greater than or equal to ${value}`,
	});

	/**
	 * Data must be less than or equl to a specified value
	 * @param value Value to compare to
	 */
	static lte = (value: number) => ({
		run: (data: unknown): boolean | string =>
			Validators.lt(value).run(data) || Validators.eq(value).run(data),
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
				let v = Validators.resolve(validator);
				let res = v.run(data);
				if (typeof res === 'string') {
					results.push(res);
					if (v.errorMessage) results.push(v.errorMessage);
				} else if (res) {
					results.push(true);
				} else {
					results.push(v.errorMessage || `{KEY} is invalid`);
				}
			});
			if (results.every(x => x === true)) return true;
			return `(${results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('<br>AND ')})`;
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
				let v = Validators.resolve(validator);
				let res = v.run(data);

				if (typeof res === 'string') {
					results.push(res);
					if (v.errorMessage) results.push(v.errorMessage);
				} else if (res) {
					results.push(true);
				} else {
					results.push(v.errorMessage || `{KEY} is invalid`);
				}
			});
			if (results.some(x => x === true)) return true;
			return `(${results
				.filter(x => x !== true)
				.filter((x, i, a) => a.indexOf(x) == i)
				.join('<br>OR ')})`;
		},
	});

	/**
	 * Validator must fail
	 * @param validator Validator to run
	 */
	static not = (validator: RequestValidateKeyOptionsResolvable) => ({
		run: (data: unknown): boolean | string => {
			let v = Validators.resolve(validator);
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
		run: (data: unknown): boolean | string =>
			Validators.or(Validators.not(Validators.exists), validator).run(
				data,
			),
	});

	/**
	 * All array items match validator
	 * @param validator Validator to run on array values
	 */
	static array = (validator: RequestValidateKeyOptionsResolvable) => ({
		run: (data: unknown): boolean | string => {
			if (!Array.isArray(data)) return '{KEY} must be an array';
			let v = Validators.resolve(validator);
			let results = data.map(x => v.run(x));
			let errors = results
				.map(
					(x, i) =>
						x == true ||
						(x || v.errorMessage || '{KEY} is invalid').replace(
							/\{KEY\}/g,
							`{KEY} (index ${i})`,
						),
				)
				.filter(x => x !== true);
			if (errors.length > 0) return errors.join('<br>');
			return true;
		},
	});

	/**
	 * Split string by delimiter and validate each item
	 * @param validator Validator to run on array values
	 * @param delimiter Delimiter to split string by
	 */
	static arrayString = (
		validator: RequestValidateKeyOptionsResolvable,
		delimiter = ',',
	) =>
		Validators.and(Validators.string, {
			run: (data: unknown): boolean | string =>
				Validators.array(validator).run(
					(data as string).split(delimiter),
				),
		});

	/**
	 * Validator must match value (if not array) or all values in array
	 */
	static arrayOrValue = (validator: RequestValidateKeyOptionsResolvable) => ({
		run: (data: unknown): boolean | string =>
			(Array.isArray(data)
				? Validators.array(validator)
				: Validators.resolve(validator)
			).run(data),
	});

	/**
	 * Valid currency amount
	 * @param canBeZero If true, zero is a valid amount
	 */
	static currency = (canBeZero: boolean = false) => ({
		run: Validators.and(
			Validators.anyNumber,
			(canBeZero ? Validators.gte : Validators.gt)(0),
			{
				run: (data: unknown): boolean | string => {
					if (!Validators.anyNumber().run(data))
						return '{KEY} must be a number';
					return (
						Math.round(numberFromData(data) * 100) / 100 ==
						numberFromData(data)
					);
				},
				errorMessage: '{KEY} cannot have more than 2 decimal places',
			},
		).run,
	});

	/** Valid mongoBD object ID */
	static objectID = () => ({
		run: (data: unknown): boolean | string => {
			return isValidObjectId(data) || '{KEY} must be a valid ObjectID';
		},
	});

	/** Valid date (ISO or epoch timestamp in ms) */
	static date = () => ({
		run: (data: unknown): data is string | number => {
			let isStr = Validators.string().run(data);
			let isNum = Validators.anyNumber().run(data);
			if (!isStr && !isNum) return false;
			let str = stringFromData(data);
			let num = numberFromData(data);

			if (
				isStr &&
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(str!) &&
				!isNaN(new Date(str!).getTime())
			)
				// ISO
				return true;
			if (isNum && !isNaN(new Date(num!).getTime()))
				// Epoch
				return true;
			return false;
		},
		errorMessage: '{KEY} must be a valid ISO date or epoch timestamp (ms)',
	});

	/** Valid role */
	static role = () => ({
		run: (data: unknown) => typeof data == 'string' && isValidRole(data),
		errorMessage: '{KEY} must be a valid role',
	});

	/** Valid school ID */
	static schoolID = () => ({
		run: (data: unknown): boolean | string =>
			Validators.regex(/^\d{5,6}$/).run(data),
		errorMessage: '{KEY} must be a valid school ID',
	});
}
