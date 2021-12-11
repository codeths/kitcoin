import {writable, get} from 'svelte/store';

export const storeInfo = writable(null);
export const userInfo = writable(null);
export const storeItemInfo = writable({});
export const storeItemPages = writable({});

export async function getStores(ignore) {
	if (get(storeInfo)) return get(storeInfo);
	let res = await fetch('/api/stores');
	if (!res || !res.ok) throw new Error('Failed to fetch stores');
	let json = await res.json();
	storeInfo.set(json);
	json.forEach(x => x._id !== ignore && getItems(x._id, 1, true));
	return json;
}

export async function getItems(store, page, useCache) {
	let cached = (get(storeItemPages)[store] || [])[page];
	cache: if (cached && useCache) {
		let itemInfo = get(storeItemInfo);
		let items = Object.assign({}, cached);
		items.items = items.items.map(x => itemInfo[x]);
		if (items.items.some(x => !x)) break cache;
		return items;
	}
	let res = await fetch(
		`/api/store/${store}/items?page=${page}&count=12`,
	).catch(e => {});
	if (!res || !res.ok) throw new Error('Failed to fetch items');
	let items = await res.json();
	storeItemInfo.update(v => {
		items.items.forEach(item => {
			v[item._id] = item;
		});
		return v;
	});
	storeItemPages.update(v => {
		if (!v[store]) v[store] = [];
		let p = Object.assign({}, items);
		p.items = p.items.map(x => x._id);
		v[store][page] = p;
		return v;
	});
	return items;
}
