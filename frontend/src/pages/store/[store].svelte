<script>
	import {params, url} from '@roxi/routify';
	import {getContext, onMount} from 'svelte';
	import Header from '../../components/Header.svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';
	import Loading from '../../components/Loading.svelte';
	import Button from '../../components/Button.svelte';
	import {
		storeInfo,
		storeItemInfo,
		storeItemPages,
		getStores,
		getItems,
	} from '../../utils/store.js';

	let info = $storeInfo;

	let storeID;
	$: {
		storeID = $params.store;
		if (storeID) {
			load(null, null, true);
			if (!info) getStores(storeID);
		}
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
			items = await getItems(storeID, page || currentPage, useCache);
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
</script>

<!-- Head -->
<Header sticky />

<!-- Content -->
<div class="p-6 mt-6">
	<Button href={$url('.')} class="inline-flex mb-8 w-auto">
		Back to store list
	</Button>
	{#await getStore()}
		<h2 class="text-4xl font-bold text-center">Loading...</h2>
	{:then store}
		<h2 class="text-4xl font-bold mb-6">{store.name}</h2>
		{#if error || !items || items.docCount == 0}
			<h2 class="text-center">
				{#if error}
					An Error Occured
				{:else if loading && !items}
					Loading...
				{:else}
					No Items
				{/if}
			</h2>
		{:else}
			<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each items.items as item}
					<div class="p-4 border shadow flex flex-col">
						<p class="text-3xl font-semibold text-gray-800">
							{item.name}
						</p>
						<p class="text-2xl font-semibold text-gray-800">
							<span
								class="icon icon-currency mr-3"
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
							class="mt-6"
							src="/api/store/{storeID}/item/{item._id}/image.png"
							alt={item.name}
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
				<Button
					on:click={() => load(currentPage - 1, 'previous', true)}
					class="mx-2"
					disabled={loading || currentPage <= 1}
				>
					{#if loading == 'previous'}
						<Loading height="2rem" />
					{:else}
						Previous
					{/if}
				</Button>
				<Button
					on:click={() => load(currentPage + 1, 'next', true)}
					class="mx-2"
					disabled={loading || currentPage >= items.pageCount}
				>
					{#if loading == 'next'}
						<Loading height="2rem" />
					{:else}
						Next
					{/if}
				</Button>
			{:else}
				<Button
					on:click={() => load(currentPage ?? 1, 'refresh')}
					class="mx-2"
					disabled={loading}
				>
					{#if loading == 'refresh'}
						<Loading height="2rem" />
					{:else if error}
						Retry
					{:else}
						Refresh
					{/if}
				</Button>
			{/if}
		</div>
	{:catch error}
		<h2>{error}</h2>
		{#if authMsg}
			<div class="inline-block my-4 p-4 rounded bg-red-200">
				{#if authMsg == 'NO_USER'}
					You are not logged in. <a
						href="/signin?redirect={encodeURIComponent(
							window.location.pathname,
						)}&hint=true"
						class="underline font-bold"
						target="_self">Sign in</a
					> to view your private stores.
				{:else if authMsg == 'CLASSROOM'}
					KitCoin is unable to access your Google Classroom classes. <a
						href="/signin?redirect={encodeURIComponent(
							window.location.pathname,
						)}&hint=true"
						class="underline font-bold"
						target="_self">Sign in</a
					> again to grant the permission.
				{/if}
			</div>
		{/if}
	{/await}
</div>
