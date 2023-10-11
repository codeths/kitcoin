import typegoose, {DocumentType} from '@typegoose/typegoose';
import {
	StoreRequestStatus,
	IStoreRequestAPIResponse,
} from '../../types/index.js';
import {Store, StoreItem, User} from './index.js';
const {index, prop} = typegoose;

@index({storeID: 1})
@index({studentID: 1})
export default class StoreRequest {
	/**
	 * Which store the request is in (Mongo ID)
	 */
	@prop({required: true})
	public storeID!: string;

	/**
	 * What item is being requested (Mongo ID)
	 */
	@prop({required: true})
	public itemID!: string;

	/**
	 * Student's ID (Mongo ID)
	 */
	@prop({required: true})
	public studentID!: string;

	/**
	 * Transaction ID (Mongo ID)
	 */
	@prop({required: true})
	public transactionID!: string;

	@prop()
	public quantity?: number;

	@prop({required: true})
	public price!: number;

	@prop({
		required: true,
		type: Number,
		enum: StoreRequestStatus,
		default: StoreRequestStatus.PENDING,
	})
	public status!: StoreRequestStatus;

	/**
	 * The date of the request
	 */
	@prop({required: true, default: () => new Date()})
	public date!: Date;

	/**
	 * Turn this transaction into a JSON object for API output
	 */
	public async toAPIResponse(
		this: DocumentType<StoreRequest>,
	): Promise<IStoreRequestAPIResponse | null> {
		let json = this.toObject({
			getters: true,
			versionKey: false,
		});
		delete json.id;

		let {storeID, itemID, studentID, ...rest} = json;
		let isPending = json.status === StoreRequestStatus.PENDING;

		type DBData = {
			name: string;
			id: string;
			archived?: boolean;
		} | null;

		let store: DBData = await Store.findById(storeID);
		let item: DBData = await StoreItem.findById(itemID);
		let student: DBData = await User.findById(studentID);
		if (!store) {
			if (isPending) return null;
			store = {
				id: storeID,
				name: 'Unknown Store',
			};
		} else if (store.archived && isPending) return null;
		if (!item) {
			if (isPending) return null;
			item = {
				id: itemID,
				name: 'Unknown Item',
			};
		} else if (item.archived && isPending) return null;
		if (!student) {
			if (isPending) return null;
			student = {
				id: studentID,
				name: 'Unknown Student',
			};
		} else if (student.archived && isPending) return null;

		let res: IStoreRequestAPIResponse = {
			...rest,
			date: this.date.toISOString(),
			store: {
				id: store.id,
				name: store.name,
			},
			item: {
				id: item.id,
				name: item.name,
			},
			student: {
				id: student.id,
				name: student.name,
			},
			status: StoreRequestStatus[this.status],
		};

		return res;
	}
}
