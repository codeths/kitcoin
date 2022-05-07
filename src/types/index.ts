export * from './db.js';
export * from './google.js';
export * from './request.js';

export function notEmpty<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

export function isValidEnumValue(
	enumObject: {[key: number]: string},
	data: unknown,
): data is typeof enumObject {
	return (
		typeof data === 'string' &&
		isNaN(parseInt(data)) &&
		Object.keys(enumObject).includes(data)
	);
}

export function isValidEnumValueArray(
	enumObject: {[key: number]: string},
	data: unknown,
): data is typeof enumObject[] {
	if (!Array.isArray(data)) return false;
	return data.every(isValidEnumValue.bind(null, enumObject));
}

/**
 * @param T Original type
 * @param R Add/Replace these keys
 * @param D Delete these keys
 */
export type Modify<T, R, D extends keyof any = never> = Omit<T, keyof R | D> &
	R;
