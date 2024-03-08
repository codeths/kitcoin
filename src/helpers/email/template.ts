const prefString: String = `To manage your email preferences, please click <a href="https://kitcoin.app/emails">here</a>`;
import {url} from '../../config/keys.js';

export function sendTemplate(
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
		`. You can view your transaction history by clicking <a href="${url}">here</a>. 
		<br><br>Sincerely,<br>
    The ETHS Kitcoin Team<br><br>
	You're receiving this email because someone sent you Kitcoin. ${prefString}.
    `
	);
}
export function requestTemplate(
	quantity: number,
	fromUser: String,
	managerUser: String,
	itemName: String,
	storeName: String,
	storeID: String,
) {
	return `
    Dear ${managerUser},<br><br>
    
    ${fromUser} requested ${quantity} ${itemName} from your store ${storeName}. To approve or deny this purchase request, please click <a href="${url}/${storeID}">here</a>.
    <br><br>Sincerely,<br>
    The ETHS Kitcoin Team<br><br>
	You're receiving this email because a student requested Kitcoin from a store that you manage. ${prefString}.
    `;
}
