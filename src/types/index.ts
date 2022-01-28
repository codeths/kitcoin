export * from './db';
export * from './google';
export * from './request';

export function notEmpty<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

export type Modify<T, R> = Omit<T, keyof R> & R;
