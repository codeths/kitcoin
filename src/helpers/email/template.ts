import {error} from 'console';
import {DBError, User} from '../../struct/index.js';
import e from 'express';
export function fillTemplate(
	amount: Number,
	fromUser: String,
	toUser: String,
	userBalance: Number,
	message: String,
) {
	return (
		`
    Dear ${toUser},
    
    You've earned ${amount} Kitcoin from ${fromUser}!` +
		(message = true ? 'They added the following note: ${message}.' : '') +
		`Your current balance is ${userBalance} Kitcoins. You can view your transaction history online at https://kitcoin.app. 
    Sincerely,
    The ETHS Kitcoin Team
    `
	);
}
