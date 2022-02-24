import typegoose, {DocumentType} from '@typegoose/typegoose';
const {index, prop} = typegoose;
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

@index({storeID: 1})
export default class StoreItem {
	/**
	 * Which store the item is in (Mongo ID)
	 */
	@prop({required: true})
	public storeID!: string;

	/**
	 * Name of the store item
	 */
	@prop({required: true})
	public name!: string;

	@prop()
	public quantity?: number;

	/**
	 * Item description
	 */
	@prop()
	public description?: string;

	@prop({required: true})
	public price!: number;

	/**
	 * Hash of the item's image
	 */
	@prop()
	public imageHash?: string;

	@prop({required: true, default: false})
	public pinned: boolean = false;

	public get createdAt(): Date {
		return (
			this as unknown as DocumentType<typeof StoreItem>
		)._id.getTimestamp();
	}

	public get newArrival() {
		return (
			(this.createdAt.getTime() || 0) >=
			Date.now() - 1000 * 60 * 60 * 24 * 7
		);
	}

	public static async findByStoreID(
		this: ReturnModelType<typeof StoreItem>,
		storeID: string,
	): Promise<DocumentType<StoreItem>[]> {
		return this.find({storeID});
	}
}
