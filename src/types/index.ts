export * from './db';
export * from './google';
export * from './request';

export function notEmpty<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * @param T Original type
 * @param R Add/Replace these keys
 * @param D Delete they keys
 */
export type Modify<T, R, D extends keyof any = never> = Omit<T, keyof R | D> &
	R;
