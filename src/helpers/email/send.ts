import nodemailer from 'nodemailer';
import {
	email_server,
	email_port,
	email_insecure_do_not_use_in_prod,
	email_username,
	email_password,
	email_from,
	email_replyto,
} from '../../config/keys.js';
const transporter = nodemailer.createTransport({
	host: email_server,
	port: email_port,
	secure: !email_insecure_do_not_use_in_prod,
	auth: {
		user: email_username,
		pass: email_password,
	},
});
import {Store, StoreItem, User} from '../../struct/index.js';
import {sendTemplate, requestTemplate} from './template.js';
export async function newTransaction(
	amount: number,
	fromUserID: string | null,
	toUserID: string,
	message: string,
	fromString?: string,
) {
	let fromUser = await User.findById(fromUserID);
	let toUser = await User.findById(toUserID);
	let finalFrom = fromUserID ? fromUser?.name : fromString;
	if (!finalFrom || !toUser) {
		return false;
	} else if (!toUser.emails) {
		return true;
	} else {
		let msg = sendTemplate(
			amount,
			finalFrom,
			toUser.name,
			toUser.balance,
			message,
		);
		let email = {
			from: `ETHS Kitcoin Team <${email_from}>`,
			replyTo: email_replyto,
			to: toUser.email,
			subject:
				message == 'Balance Migration'
					? 'Your Kitcoin balance has been migrated!'
					: `${finalFrom} sent you Kitcoin!`,
			html: msg,
		};
		return await transporter.sendMail(email).catch(console.log);
	}
}

export async function newRequest(requestObj: any) {
	let requestingUser = await User.findById(requestObj.studentID);
	let item = await StoreItem.findById(requestObj.itemID);
	let store = await Store.findById(requestObj.storeID);
	let messages: Object[] = [];
	let managers: string[] = [];

	if (!requestingUser || !item || !store) {
		return false;
	} else {
		managers.push(store.owner);
		store.managers.forEach(element => {
			managers.push(element);
		});
		for (let i = 0; i < managers.length; i++) {
			if (!requestingUser || !item || !store) {
				return false;
			}
			let manager = await User.findById(managers[i]);
			if (!manager) {
				return false;
			} else if (manager.emails) {
				let msg = requestTemplate(
					requestObj.quantity,
					requestingUser.name,
					manager.name,
					item.name,
					store.name,
					store._id,
				);
				let email = {
					from: `ETHS Kitcoin Team <${email_from}>`,
					replyTo: email_replyto,
					to: manager.email,
					subject:
						`${requestingUser.name} requested ` +
						(requestObj.quantity > 1 ? 'items!' : 'an item!'),
					html: msg,
				};
				await transporter.sendMail(email).catch(console.log);
			}
		}
		return true;
	}
}
