import {classAnyInfo, classStudentInfo, classTeacherInfo} from './store';
import {get} from 'svelte/store';

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
	const res = await fetch(`/api/users/search?${params.toString()}`).catch(
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
	let store = null;
	if (role == 'any') store = classAnyInfo;
	else if (role == 'teacher') store = classTeacherInfo;
	else if (role == 'student') store = classStudentInfo;

	if (get(store)) return get(store);
	const res = await fetch(`/api/classes?role=${role.toLowerCase()}`).catch(
		e => null,
	);
	if (res && res.ok) {
		try {
			const json = await res.json();
			if (store) store.set(json);
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
			if (json.length == 0) return 'No Students';
			return json;
		} catch (e) {
			throw 'An error occured.';
		}
	} else {
		throw res && res.status == 401 ? 'Not logged in' : 'An error occured.';
	}
}

async function getUserInfo() {
	const info = await fetch('/api/users/me').catch(e => null);
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
