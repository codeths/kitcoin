import {writable, get} from 'svelte/store';

export const storeInfo = writable(null);
export const userInfo = writable(null);
export const storeItemList = writable({});
export const newArrivalList = writable(null);
export const classAnyInfo = writable(null);
export const classTeacherInfo = writable(null);
export const classStudentInfo = writable(null);

export const LOW_STOCK = 3; //Low stock if there are this many items or less

export async function getStores(useCache = true, query, user) {
	let queryStr = [];
	if (query) {
		queryStr.push(`search=${query}`);
		useCache = false;
	}
	if (user) {
		queryStr.push(`user=${user}`);
		useCache = false;
	}
	if (useCache && get(storeInfo)) return get(storeInfo);
	let res = await fetch(`/api/store?${queryStr.join('&')}`);
	if (!res || !res.ok) throw new Error('Failed to fetch stores');
	let json = await res.json();
	if (!query && !user) storeInfo.set(json);
	return json;
}

export async function getItems(store, useCache) {
	let cached = get(storeItemList)[store];
	if (cached && useCache) return cached;
	let res = await fetch(`/api/store/${store}/items`).catch(e => {});
	if (!res || !res.ok) throw new Error('Failed to fetch items');
	let items = await res.json();
	storeItemList.update(v => {
		v[store] = items;
		return v;
	});
	return items;
}

export async function getNewArrivals() {
	let cached = get(newArrivalList);
	if (cached) return cached;
	let res = await fetch(`/api/store/newarrivals`).catch(e => {});
	if (!res || !res.ok) throw 'Failed to fetch items';
	let items = await res.json();
	newArrivalList.set(items);
	return items;
}
