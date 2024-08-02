import {hostname} from '../../config/keys.js';
const prefString = `To manage your email preferences, please click <a href="${hostname}/settings">here</a>`;

export function sendTemplate(
	amount: number,
	fromUser: string,
	toUser: string,
	userBalance: number,
	message: string,
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
		`. You can view your transaction history by clicking <a href="${hostname}">here</a>. 
		<br><br>Sincerely,<br>
    The ETHS Kitcoin Team<br><br>
	You're receiving this email because someone sent you Kitcoin. ${prefString}.
    `
	);
}
export function requestTemplate(
	quantity: number,
	fromUser: string,
	managerUser: string,
	itemName: string,
	storeName: string,
	storeID: string,
) {
	return `
    Dear ${managerUser},<br><br>
    
    ${fromUser} requested ${quantity} ${itemName} from your store ${storeName}. To approve or deny this purchase request, please click <a href="${hostname}/store/${storeID}">here</a>.
    <br><br>Sincerely,<br>
    The ETHS Kitcoin Team<br><br>
	You're receiving this email because a student requested Kitcoin from a store that you manage. ${prefString}.
    `;
}
