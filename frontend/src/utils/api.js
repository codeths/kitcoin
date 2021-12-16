async function getBalance(user = 'me') {
	const res = await fetch(`/api/balance/${user}`).catch(e => null);
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

async function getTransactions(user = 'me', page = 1) {
	const res = await fetch(`/api/transactions/${user}?page=${page}`).catch(
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

async function searchUsers(search, count, roles, me) {
	const params = new URLSearchParams();
	params.append('q', search);
	if (count !== null && count !== undefined) params.append('count', count);
	if (me !== null && me !== undefined) params.append('me', me);
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

async function getClasses(role = 'any') {
	const res = await fetch(`/api/classes?role=${role.toLowerCase()}`).catch(
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

async function getClassStudents(id) {
	const res = await fetch(`/api/students/${id}`).catch(e => null);
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

async function getUserInfo() {
	const info = await fetch('/api/me').catch(e => null);
	if (info && info.ok) {
		try {
			let userInfo = await info.json();
			return userInfo;
		} catch (e) {
			throw 'An error occured.';
		}
	} else {
		throw info && info.status == 401
			? 'Not logged in'
			: 'An error occured.';
	}
}

export {
	getBalance,
	getTransactions,
	searchUsers,
	getClasses,
	getClassStudents,
	getUserInfo,
};
