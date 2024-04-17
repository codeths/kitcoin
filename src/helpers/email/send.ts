import nodemailer from 'nodemailer';
import {
	email_server,
	email_port,
	email_username,
	email_password,
	email_from,
	email_replyto,
} from '../../config/keys.js';
const transporter = nodemailer.createTransport({
	host: email_server,
	port: email_port,
	secure: true,
	auth: {
		user: email_username,
		pass: email_password,
	},
});
import {Store, StoreItem, User} from '../../struct/index.js';
import {sendTemplate, requestTemplate} from './template.js';
export async function newTransaction(
	amount: number,
	fromUserID: String,
	toUserID: String,
	message: String,
): Promise<any> {
	let fromUser = await User.findById(fromUserID);
	let toUser = await User.findById(toUserID);
	if (!fromUser || !toUser || !toUser.emails) {
		return 'false';
	} else {
		let msg = sendTemplate(
			amount,
			fromUser.name,
			toUser.name,
			toUser.balance,
			message,
		);
		let email = {
			from: `ETHS Kitcoin Team <${email_from}>`,
			replyTo: email_replyto,
			to: toUser.email,
			subject: `${fromUser.name} sent you Kitcoin!`,
			html: msg,
		};
		return await transporter.sendMail(email).catch(console.log);
	}
}

export async function newRequest(
	fromUserID: String,
	storeObj: any,
): Promise<any> {
	let requestingUser = await User.findById(fromUserID);
	let managerUser = await User.findById(storeObj.manager);
	let item = await StoreItem.findById(storeObj.item);
	let store = await Store.findById(storeObj.id);
	if (
		!requestingUser ||
		!managerUser ||
		!item ||
		!store ||
		!managerUser.emails
	) {
		return 'false';
	} else {
		let msg = requestTemplate(
			storeObj.quantity,
			requestingUser.name,
			managerUser.name,
			item.name,
			store.name,
			store._id,
		);
		let email = {
			from: `ETHS Kitcoin Team <${email_from}>`,
			replyTo: email_replyto,
			to: managerUser.email,
			subject:
				`${requestingUser.name} requested ` +
				(storeObj.quantity > 1 ? 'items!' : 'an item!'),
			html: msg,
		};
		return await transporter.sendMail(email).catch(console.log);
	}
}
