declare module 'mongoose' {
	export interface Query<
		ResultType,
		DocType,
		THelpers = {},
		RawDocType = DocType,
	> {
		/** Make a copy of this query so you can re-execute it. */
		clone(): this;
	}
}
