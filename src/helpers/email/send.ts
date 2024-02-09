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
import {error} from 'console';
import {DBError, User} from '../../struct/index.js';
import e from 'express';
function fillTemplate(
	amount: number,
	fromUser: String,
	toUser: String,
	userBalance: number,
	message: String,
) {
	return (
		`
    Dear ${toUser},<br><br>
    
    You've earned ${amount} Kitcoin` +
		(amount > 1 ? 's' : '') +
		` from ${fromUser}! ` +
		(message != null ? `They added the following note: ${message}. ` : '') +
		`Your current balance is ${userBalance} Kitcoin` +
		(userBalance > 1 ? 's' : '') +
		`. You can view your transaction history online at https://kitcoin.app. 
    <br><br>Sincerely,
    The ETHS Kitcoin Team
    `
	);
}

export async function Sender(
	transactionType: String,
	amount: number,
	fromUserID: String,
	toUserID: String,
	message: String,
): Promise<String> {
	if (transactionType == 'bulksend' || transactionType == 'send') {
		let fromUser = await User.findById(fromUserID);
		let toUser = await User.findById(toUserID);
		if (!fromUser || !toUser) {
			return 'false';
		} else {
			let HTMLEmail = fillTemplate(
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
				html: HTMLEmail,
			};
			await transporter.sendMail(email);
			return 'sent';
		}
	} else {
		return 'false';
	}
}
