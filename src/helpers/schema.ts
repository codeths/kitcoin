import * as mongoose from "mongoose";
import { mongo as mongoURL } from "../config/keys.json";
import { IUser, ITransaction } from "../types";

mongoose.connect(mongoURL);

const userSchema = new mongoose.Schema<IUser>({
	email: {
		type: String,
		required: true,
	},
	name: {
		type: String,
	},
	tokens: {
		refresh: {
			type: String,
			default: null,
		},
		access: {
			type: String,
			default: null,
		},
		expires: {
			type: Date,
			default: null,
		}
	}
});

userSchema.index({ email: 1 }, { unique: true });

userSchema.methods.getBalance = async function () {
	const id = this._id;

	const latestTransaction = await Transaction.findOne({
		user: id
	});

	if (!latestTransaction) return 0;
	return latestTransaction.balance;
}

const transactionSchema = new mongoose.Schema<ITransaction>({
	amount: {
		type: Number,
		required: true,
	},
	reason: String,
	user: String,
	owner: String,
	balance: {
		type: Number,
		required: true,
	}
});

transactionSchema.index({ user: -1 });

const User = mongoose.model<IUser>("User", userSchema);
const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);

export { User, Transaction };