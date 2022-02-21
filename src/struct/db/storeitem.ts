import {prop, DocumentType, index} from '@typegoose/typegoose';
import {IStoreAPIResponse} from '../../types';
import {IStore, Store, User} from '.';
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

@index({storeID: 1})
export default class StoreItem {
	/**
	 * Which store the item is in (Mongo ID)
	 */
	@prop({required: true})
	storeID!: string;
	/**
	 * Name of the store item
	 */
	@prop({required: true})
	name!: string;

	@prop()
	quantity?: number;
	/**
	 * Item description
	 */

	@prop()
	description?: string;

	@prop({required: true})
	price!: number;

	/**
	 * Hash of the item's image
	 */
	@prop()
	imageHash?: string;

	public async getStore(
		this: DocumentType<StoreItem>,
	): Promise<IStore | null> {
		return Store.findById(this.storeID);
	}

	public static async findByStoreID(
		this: ReturnModelType<typeof StoreItem>,
		storeID: string,
	): Promise<DocumentType<StoreItem>[]> {
		return this.find({storeID});
	}
}
