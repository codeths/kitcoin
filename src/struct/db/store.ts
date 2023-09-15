import typegoose, {DocumentType} from '@typegoose/typegoose';
const {index, prop} = typegoose;
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

import {IStoreAPIResponse} from '../../types/index.js';
import {User} from './index.js';

@index({classIDs: 1})
export default class Store {
	@prop({required: true})
	public name!: string;

	@prop()
	public description?: string;

	/**
	 * Google classroom ID (if applicable)
	 */
	@prop({type: [String]})
	public classIDs: string[] = [];

	/**
	 * Should the store be shown to everyone
	 */
	@prop({required: true, default: true})
	public public: boolean = true;

	/**
	 * Mongo ID of the person who owns this store
	 */
	@prop({required: true})
	public owner!: string;

	/**
	 * Mongo IDs of users who can manage this store
	 */
	@prop({type: [String]})
	public managers: string[] = [];

	/**
	 * Mongo IDs of users who can view this store
	 */
	@prop({type: [String]})
	public users: string[] = [];

	/**
	 * If the store is pinned at the top of the "stores" page
	 */
	@prop({required: true, default: false})
	public pinned: boolean = false;

	/**
	 * Allow purchase requests
	 */
	@prop({required: true, default: true})
	public requests: boolean = true;

	/**
	 * Allow deductions from price when selling item
	 */
	@prop({required: true, default: false})
	public allowDeductions: boolean = false;

	/**
	 * If the store has been archived
	 */
	@prop()
	public archived: boolean;

	/**
	 * Archives the store
	 */
	public archive() {
		this.archived = true;
	}

	public async toAPIResponse(
		this: DocumentType<Store>,
		canManage: boolean,
	): Promise<IStoreAPIResponse> {
		let data = this.toObject({
			getters: true,
			versionKey: false,
		});
		delete data.id;

		if (!canManage) {
			let res: IStoreAPIResponse = {
				...data,
				users: undefined,
				managers: undefined,
				classIDs: undefined,
				owner: undefined,
				canManage,
			};
			return res;
		}

		let userData = await Promise.all(
			[this.users, this.managers, this.owner].flat().map(async id => {
				let user = await User.findById(id);
				return user ? {name: user.name || '', id} : {name: '', id};
			}),
		);

		let res: IStoreAPIResponse = {
			...data,
			users: data.users.map(id => userData.find(x => x.id == id)!),
			managers: data.managers.map(id => userData.find(x => x.id == id)!),
			owner: userData.find(x => x.id == data.owner)!,
			canManage,
		};

		return res;
	}

	public static async findByClassCode(
		this: ReturnModelType<typeof Store>,
		classCode: string,
	): Promise<DocumentType<Store> | null> {
		return this.findOne({classIDs: classCode});
	}
}
