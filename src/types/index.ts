export * from './db.js';
export * from './google.js';
export * from './request.js';

export function notEmpty<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * @param T Original type
 * @param R Add/Replace these keys
 * @param D Delete these keys
 */
export type Modify<T, R, D extends keyof any = never> = Omit<T, keyof R | D> &
	R;
