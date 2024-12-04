import {hostname} from '../../config/keys.js';
const prefString = `To manage your email preferences, please click <a href="${hostname}/settings">here</a>. If you have any questions, you can contact the Kitcoin team by replying to this email or emailing us at <a href="mailto:kitcoin@eths202.org">kitcoin@eths202.org</a>`;

export function sendTemplate(
	amount: number,
	fromUser: string,
	toUser: string,
	userBalance: number,
	message: string | undefined,
) {
	if (message == 'Balance Migration') {
		return `Dear ${toUser},<br><br>  

			Your Kitcoin balance (of ${amount} Kitcoin${
			amount > 1 ? 's' : ''
		}) has been migrated! This year, ETHS is introducing an updated version of Kitcoin. Now, you can <a href="${hostname}">check your balance/transactions</a> and <a href="${hostname}/store">spend Kitcoin</a> online 24/7. Like before, you can spend your Kitcoin at a ratio of 1 Kitcoin to 1 dollar. For example, a limited number of ETHS Football tickets are now available for just 3 Kitcoin each! Look for additional ways to use your Kitcoin to be announced later this year.
			<br>
			<br>
			Your current balance is ${userBalance} Kitcoin${userBalance > 1 ? 's' : ''}.
			<br>
			<br>
			GO KITS!
			<br>
			<br>
			The ETHS Kitcoin Team
			<br>
			<br>
			You're receiving this email because someone sent you Kitcoin. ${prefString}.
		`;
	} else {
		return (
			`
		Dear ${toUser},<br><br>
		
		You've earned ${amount} Kitcoin` +
			` from ${fromUser}! ` +
			(message ? `They added the following note: ${message}. ` : '') +
			`Your current balance is ${userBalance} Kitcoin` +
			`. You can view your transaction history by clicking <a href="${hostname}">here</a>. 
			<br><br>Sincerely,<br>
		The ETHS Kitcoin Team<br><br>
		You're receiving this email because someone sent you Kitcoin. ${prefString}.
		`
		);
	}
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
    Your current balance is ${userBalance} Kitcoin
	`;
}

export function purchaseConfirmation(
	quantity: number,
	userBalance: number,
	student: string,
	itemName: string,
	storeName: string,
	status: string,
) {
	return `
    Dear ${student},<br><br>
    
    Your purchase for ${quantity} ${itemName} from the store ${storeName}.
    <br><br>Sincerely,<br>
    The ETHS Kitcoin Team<br><br>
	You're receiving this email because you purchased something from the Kitcoin store. ${prefString}.
    Your balance is now ${userBalance}
	`;
}
