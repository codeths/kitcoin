async function getBalance() {
	const res = await fetch('/api/balance/me').catch(e => null);
	if (res && res.ok) {
		try {
			const json = await res.json();
			return json.balance;
		} catch (e) {
			throw 'An error occured.';
		}
	} else {
		throw res && res.status == 401 ? 'Not logged in' : 'An error occured.';
	}
}

async function getTransactions() {
	const res = await fetch('/api/transactions/me').catch(e => null);
	if (res && res.ok) {
		try {
			const json = await res.json();
			return json;
		} catch (e) {
			throw 'An error occured.';
		}
	} else {
		throw res && res.status == 401 ? 'Not logged in' : 'An error occured.';
	}
}

async function searchUsers(search, count, roles) {
	const params = new URLSearchParams();
	params.append('q', search);
	if (count !== null) params.append('count', count);
	if (roles) params.append('roles', roles.join(','));
	const res = await fetch(`/api/search?${params.toString()}`).catch(
		e => null,
	);
	if (res && res.ok) {
		try {
			const json = await res.json();
			return json;
		} catch (e) {
			throw 'An error occured.';
		}
	} else {
		throw res && res.status == 401 ? 'Not logged in' : 'An error occured.';
	}
}

export {getBalance, getTransactions, searchUsers};
