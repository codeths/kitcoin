<script>
	import {params, url, metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import Loading from '../../components/Loading.svelte';
	import {storeInfo, getStores, getItems} from '../../utils/store.js';
	import {getBalance} from '../../utils/api.js';

	let info = $storeInfo;

	storeInfo.subscribe(newInfo => {
		info = newInfo;
	});

	let storeID, store;
	$: {
		if (storeID !== $params.store) {
			storeID = $params.store;
			store = (info || []).find(s => s._id === storeID);
			if (storeID) {
				load(null, null, true);
				if (!info) getStores(storeID);
			}
		}
		metatags.title = `Store${
			store && store.name ? ` - ${store.name}` : ''
		} - Kitcoin`;
	}

	let ctx = getContext('userInfo');
	let authMsg = null;

	let loading = false;
	let error;
	let items = null;
	let currentPage = 1;

	async function getStore() {
		let cachedInfo = info && info.find(x => x._id === storeID);
		if (cachedInfo) return cachedInfo;
		let res = await fetch(`/api/store/${storeID}`).catch(e => {});
		if (!res) throw 'Could not fetch store';
		if (res.status == 403) {
			let info = (await ctx) || null;
			if (!info) authMsg = 'NO_USER';
			if (
				info &&
				!info.scopes.includes(
					'https://www.googleapis.com/auth/classroom.courses.readonly',
				)
			)
				authMsg = 'CLASSROOM';
			throw 'You do not have permission to access this store';
		}
		if (res.status == 404) throw 'This store does not exist';
		if (!res.ok) throw 'Could not fetch store';
		let json = await res.json().catch(e => {
			throw 'Could not fetch store';
		});
		return json;
	}

	async function load(page, which, useCache) {
		try {
			loading = which || true;
			let newItems = await getItems(
				storeID,
				page || currentPage,
				useCache,
			);
			items = {
				...newItems,
				items: items ? [] : newItems.items,
			};
			setTimeout(() => (items = newItems), 0);
			if (items.page < items.pageCount)
				getItems(storeID, items.page + 1, true);
			loading = false;
			error = false;
			if (page) currentPage = page;
			return;
		} catch (e) {
			loading = false;
			error = true;
		}
	}

	let balance = null;
	(async () => {
		balance = await getBalance().catch(e => null);
	})();
</script>

<!-- Content -->
<div class="flex flex-row flex-wrap justify-between items-center my-6">
	<button
		href={$url('.')}
		class="btn btn-primary inline-flex flex-col self-center my-4 w-auto mx-6"
	>
		Back to store list
	</button>
	{#if balance !== null}
		<div
			class="inline-flex flex-col self-center p-4 bg-base-200 rounded-lg mx-6 my-4"
		>
			<span>
				Your balance: <span
					class="icon-currency mr-1"
				/>{balance.toLocaleString([], {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</span
			>
		</div>
	{/if}
</div>
<div class="p-6">
	{#await getStore()}
		<Loading height="2rem" />
	{:then store}
		<h2 class="text-4xl font-bold mb-6">{store.name}</h2>
		{#if error || !items || !items.items || items.docCount == 0}
			<h2 class="text-center">
				{#if error}
					An Error Occured
				{:else if loading && !items}
					<Loading height="2rem" />
				{:else}
					No Items
				{/if}
			</h2>
		{:else}
			<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each items.items as item}
					<div
						class="p-4 bg-base-200 shadow rounded-lg flex flex-col"
					>
						<p class="text-3xl font-semibold">
							{item.name}
						</p>
						<p
							class="text-2xl font-semibold {balance !== null &&
							balance < item.price
								? 'text-red-500'
								: ''}"
						>
							<span
								class="icon-currency mr-3"
							/>{item.price.toLocaleString([], {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</p>
						{#if item.description}
							<p class="text-xl mt-2 whitespace-pre-wrap">
								{item.description}
							</p>
						{/if}
						<p class="flex-grow" />
						<img
							class="store-item mt-6 object-contain max-h-80"
							src="/api/store/{storeID}/item/{item._id}/image.png"
							alt={item.name}
							onload="this.style.display = ''"
							onerror="this.style.display = 'none'"
						/>
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex flex-wrap justify-center align-center pt-4">
			{#if items}
				<h2 class="text-center mb-2">
					Showing page {items.page} of {items.pageCount}
				</h2>
				<div class="flex-break" />
				<button
					on:click={() => load(currentPage - 1, 'previous', true)}
					class="btn btn-primary w-40 mx-2"
					disabled={loading || currentPage <= 1}
				>
					{#if loading == 'previous'}
						<Loading height="2rem" />
					{:else}
						Previous
					{/if}
				</button>
				<button
					on:click={() => load(currentPage + 1, 'next', true)}
					class="btn btn-primary w-40 mx-2"
					disabled={loading || currentPage >= items.pageCount}
				>
					{#if loading == 'next'}
						<Loading height="2rem" />
					{:else}
						Next
					{/if}
				</button>
			{:else}
				<button
					on:click={() => load(currentPage ?? 1, 'refresh')}
					class="btn btn-primary w-40 mx-2"
					disabled={loading}
				>
					{#if loading == 'refresh'}
						<Loading height="2rem" />
					{:else if error}
						Retry
					{:else}
						Refresh
					{/if}
				</button>
			{/if}
		</div>
	{:catch error}
		<h2>{error}</h2>
		{#if authMsg}
			<div class="alert alert-warning my-4">
				<div class="flex-1">
					<span class="icon-warning" />
					<span>
						{#if authMsg == 'NO_USER'}
							You are not logged in. <a
								href="/signin?redirect={encodeURIComponent(
									window.location.pathname,
								)}&hint=true"
								class="link font-bold"
								target="_self">Sign in</a
							> to view your private stores.
						{:else if authMsg == 'CLASSROOM'}
							Kitcoin is unable to access your Google Classroom
							classes. <a
								href="/signin?redirect={encodeURIComponent(
									window.location.pathname,
								)}&hint=true"
								class="link font-bold"
								target="_self">Sign in</a
							> again to grant the permission.
						{/if}
					</span>
				</div>
			</div>
		{/if}
	{/await}
</div>
