import {writable, get} from 'svelte/store';

export const storeInfo = writable(null);
export const userInfo = writable(null);
export const storeItemList = writable({});

export async function getStores() {
	if (get(storeInfo)) return get(storeInfo);
	let res = await fetch('/api/stores');
	if (!res || !res.ok) throw new Error('Failed to fetch stores');
	let json = await res.json();
	storeInfo.set(json);
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
