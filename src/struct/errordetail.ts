import {IErrorDetail} from '../types/db';

export class ErrorDetail {
	private data: IErrorDetail;

	constructor(data: IErrorDetail) {
		this.data = data;
	}

	get code() {
		return this.data.code;
	}

	get title() {
		return this.data.title;
	}

	get description() {
		return this.data.description;
	}

	get button() {
		return this.data.button;
	}

	/**
	 * Create a new ErrorDetail with the same data
	 * @param data Partial data to apply
	 */
	public clone(data: Partial<IErrorDetail> = {}) {
		return new ErrorDetail(Object.assign(this.data, data));
	}

	/**
	 * Edit the details
	 * @param data Partial data to apply
	 */
	public edit(data: Partial<IErrorDetail>) {
		Object.assign(this.data, data);
	}

	/**
	 * Serialize to JSON
	 */
	public toJSON(): IErrorDetail {
		return this.data;
	}

	static readonly ERROR = new ErrorDetail({
		title: 'Something went wrong',
		description: 'If this problem persists, please contact us.',
	});

	static readonly ERROR_WITH_ID = new ErrorDetail({
		code: 500,
		title: 'Something went wrong',
		description:
			'If this problem persists, please contact us and share this error ID: {CODE}',
	});

	static readonly OAUTH_SIGN_IN_FAILED = new ErrorDetail({
		title: 'Failed to sign in',
		description:
			'Please try again. If the problem persists, please contact us.',
		button: {
			text: 'Sign In Again',
			url: '/login',
		},
	});
}
