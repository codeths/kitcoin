import fuzzySearch from 'mongoose-fuzzy-searching';

import typegoose, {DocumentType} from '@typegoose/typegoose';
const {index, plugin, prop} = typegoose;
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

import {weeklyBalance} from '../../config/keys.js';
import {getAccessToken} from '../../helpers/oauth.js';
import {roundCurrency} from '../../helpers/misc.js';
import {
	IUserAPIResponse,
	MongooseFuzzyClass,
	UserRoles,
	UserRoleTypes,
} from '../../types/index.js';

class UserTokens {
	/**
	 * OAuth refresh token
	 */
	@prop()
	public refresh?: string;

	/**
	 * OAuth access token
	 */
	@prop()
	public access?: string;

	/**
	 * OAuth access token expiration date
	 */
	@prop()
	public expires?: Date;

	/**
	 * Session token
	 */
	@prop()
	public session?: string;

	/**
	 * Authorized scopes
	 */
	@prop({type: [String]})
	public scopes?: string[];
}

function endOfWeek(): Date {
	return new Date(
		new Date().getFullYear(),
		new Date().getMonth(),
		new Date().getDate() + 7 - new Date().getDay(),
	);
}

function getBalance(this: DocumentType<User>, balance: number) {
	if (!this.hasRole('STAFF')) return roundCurrency(balance);
	let rawBalanceExpires = this.get('balanceExpires', null, {
		getters: false,
	});
	if (
		!rawBalanceExpires ||
		rawBalanceExpires.getTime() < new Date().getTime()
	) {
		return roundCurrency(
			(this.balance =
				weeklyBalance * (this.weeklyBalanceMultiplier ?? 1)),
		);
	}
	return roundCurrency(balance);
}

function getBalanceExpires(this: DocumentType<User>, balanceExpires: Date) {
	if (!this.hasRole('STAFF')) return undefined;
	if (!balanceExpires || balanceExpires.getTime() < new Date().getTime()) {
		this.balanceExpires = endOfWeek();
		return this.balanceExpires;
	}
	return balanceExpires;
}

@plugin(fuzzySearch, {
	fields: [
		{
			name: 'name',
			weight: 3,
		},
		{
			name: 'email',
			weight: 1,
			prefixOnly: true,
		},
	],
	middlewares: {
		preSave: async function (this: DocumentType<User>) {
			for (let key in this) {
				if (this[key as keyof typeof this] === null)
					(this[key as keyof typeof this] as any) = undefined;
			}
		},
	},
})
@index({email: 1}, {unique: true, sparse: true})
@index({googleID: 1}, {unique: true})
@index({schoolID: 1}, {unique: true, sparse: true})
export default class User extends MongooseFuzzyClass {
	/**
	 * The user's email
	 */
	@prop()
	public email?: string;

	/**
	 * The user's Google ID
	 */
	@prop({required: true})
	public googleID!: string;

	/**
	 * The user's name
	 */
	@prop({required: true})
	public name!: string;

	/**
	 * The user's school ID
	 */
	@prop()
	public schoolID?: string;

	@prop({type: UserTokens, _id: false})
	public tokens?: UserTokens;

	/**
	 * The user's balance
	 */
	@prop({required: true, get: getBalance, set: roundCurrency, default: 0})
	public balance!: number;

	/**
	 * Staff - when their balance resets
	 */
	@prop({get: getBalanceExpires})
	public balanceExpires?: Date;

	/**
	 * Staff - multiplier for weekly balance
	 */
	@prop()
	public weeklyBalanceMultiplier?: number;

	/**
	 * The user's roles (bitfield)
	 */
	@prop({required: true, default: UserRoles.STUDENT})
	public roles!: number;

	/**
	 * Do not sync this user with Google Admin
	 */
	@prop({required: true, default: false})
	public doNotSync: boolean;

	/**
	 * Set the roles on this user
	 * @param roles An array of roles to set
	 */
	public setRoles(this: DocumentType<User>, roles: UserRoleTypes[]): void {
		this.roles = roles.reduce((acc, role) => acc | UserRoles[role], 0);
		return;
	}

	/**
	 * Get array of roles
	 */
	public getRoles(this: DocumentType<User>): UserRoleTypes[] {
		return Object.keys(UserRoles)
			.map(x => x as UserRoleTypes)
			.filter(
				role => role !== 'NONE' && role !== 'ALL' && this.hasRole(role),
			);
	}

	/**
	 * Check if the user has a role
	 * @param role The role to check for
	 */
	public hasRole(this: DocumentType<User>, role: UserRoleTypes): boolean {
		return (this.roles & UserRoles[role]) === UserRoles[role];
	}

	/**
	 * Check if the user has any of the specified roles
	 * @param roles The roles to check for
	 */
	public hasAnyRole(
		this: DocumentType<User>,
		roles: UserRoleTypes[],
	): boolean {
		return roles.some(role => this.hasRole(role));
	}

	/**
	 * Check if the user has all of the specified roles
	 * @param roles The roles to check for
	 */
	public hasAllRoles(
		this: DocumentType<User>,
		roles: UserRoleTypes[],
	): boolean {
		return roles.every(role => this.hasRole(role));
	}

	/**
	 * Turn this transaction into a JSON object for API output
	 * @param checkAuthorized Check if user has authorized OAuth
	 */
	public async toAPIResponse(
		this: DocumentType<User>,
		checkAuthorized?: boolean,
	): Promise<IUserAPIResponse> {
		let {tokens, ...noTokens} = this.toObject({
			getters: true,
			versionKey: false,
		});
		delete noTokens.id;

		let roles = this.getRoles();
		let scopes = this.tokens?.scopes || [];
		let authorized = checkAuthorized
			? !!(await getAccessToken(this))
			: undefined;

		let data: IUserAPIResponse = {
			...noTokens,
			roles,
			scopes,
			authorized,
		};

		return data;
	}

	public static async findByGoogleId(
		this: ReturnModelType<typeof User>,
		googleID: string,
	): Promise<DocumentType<User> | null> {
		return this.findOne({googleID});
	}

	public static async findBySchoolId(
		this: ReturnModelType<typeof User>,
		schoolID: string,
	): Promise<DocumentType<User> | null> {
		return this.findOne({schoolID});
	}

	public static async findByEmail(
		this: ReturnModelType<typeof User>,
		email: string,
	): Promise<DocumentType<User> | null> {
		return this.findOne({email});
	}

	public static async findByToken(
		this: ReturnModelType<typeof User>,
		token: string,
	): Promise<DocumentType<User> | null> {
		return this.findOne({'tokens.session': token});
	}
}
