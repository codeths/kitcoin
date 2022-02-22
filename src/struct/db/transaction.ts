import {DocumentType, index, prop} from '@typegoose/typegoose';
import {ReturnModelType} from '@typegoose/typegoose/lib/types';

import {ITransactionAPIResponse} from '../../types';
import {IUser, User} from './';

class TransactionUser {
	/**
	 * The user's id
	 */
	@prop()
	id?: string;
	/**
	 * Text to display (for non-user transactions)
	 */
	@prop()
	text?: string;
}

class TransactionStore {
	/**
	 * The store's id
	 */
	@prop({required: true})
	id!: string;
	/**
	 * The item's id
	 */
	@prop({required: true})
	item!: string;
	/**
	 * The store manager's id (who created the transaction)
	 */
	@prop({required: true})
	manager!: string;
}

@index({user: -1})
export default class Transaction {
	/**
	 * The amount of the transaction
	 */
	@prop({required: true})
	amount!: number;
	/**
	 * The reason of the transaction
	 */
	@prop()
	reason?: string;
	/**
	 * Who sent this transaction
	 */
	@prop({type: TransactionUser, _id: false, required: true})
	from!: TransactionUser;
	/**
	 * Who received this transaction
	 */
	@prop({type: TransactionUser, _id: false, required: true})
	to!: TransactionUser;
	/**
	 * Store details (if applicable)
	 */
	@prop({type: TransactionStore, _id: false})
	store?: TransactionStore;
	/**
	 * The date of the transaction
	 */
	@prop({required: true, default: () => new Date()})
	date!: Date;

	/**
	 * Get the text of the users involved in this transaction
	 * @param which Which user to get the text of
	 */
	public async getUserText(
		this: DocumentType<Transaction>,
		which: 'FROM' | 'TO',
	): Promise<string | null> {
		let data = which === 'FROM' ? this.from : this.to;

		return (
			data.text ||
			(data.id && (await User.findById(data.id))?.name) ||
			null
		);
	}

	/**
	 * Get whether or not a user can manage this transaction
	 * @param user User to check
	 */
	public canManage(this: DocumentType<Transaction>, user?: IUser): boolean {
		return (
			(user &&
				(user.hasRole('ADMIN') ||
					(user.hasRole('STAFF') &&
						user.id === this.from.id &&
						this.date.getTime() >
							Date.now() - 1000 * 60 * 60 * 24))) ||
			false
		);
	}

	/**
	 * Turn this transaction into a JSON object for API output
	 * @param user View transaction user info as this user
	 * @param managingUser This user is managing the transaction. Defaults to the user parameter
	 */
	public async toAPIResponse(
		this: DocumentType<Transaction>,
		user?: IUser,
		managingUser?: IUser,
	): Promise<ITransactionAPIResponse> {
		let json = this.toObject({
			getters: true,
			versionKey: false,
		});
		delete json.id;

		let res: ITransactionAPIResponse = {
			...json,
			date: this.date.toISOString(),
			canManage: this.canManage(managingUser),
		};

		if (res.from.id && !res.from.text) {
			res.from.text = (await this.getUserText('FROM')) || undefined;
			if (user) res.from.me = user.id === res.from.id;
		}

		if (res.to.id && !res.to.text) {
			res.to.text = (await this.getUserText('TO')) || undefined;
			if (user) res.to.me = user.id === res.to.id;
		}

		return res;
	}

	public static async findByUser(
		this: ReturnModelType<typeof Transaction>,
		id: string,
		{
			count,
			page,
			search,
		}: {
			count: number | null;
			page: number | null;
			search: string | null;
		},
	) {
		count ??= 10;
		page ??= 1;

		let searchOptions = search
			? {$or: [{reason: {$regex: search, $options: 'i'}}]}
			: {};

		const query = this.find({
			$or: [{'from.id': id}, {'to.id': id}],
			...searchOptions,
		})
			.sort({
				date: -1,
			})
			.limit(count)
			.skip(count * (page - 1));

		const [transactions, docCount] = await Promise.all([
			query.exec(),
			query
				.clone()
				.setOptions({
					skip: 0,
					limit: undefined,
				})
				.countDocuments()
				.exec(),
		]);

		return {
			page: page ?? 1,
			pageCount: Math.ceil(
				docCount / (query.getOptions().limit ?? transactions.length),
			),
			docCount,
			transactions,
		};
	}
}
