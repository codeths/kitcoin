<script>
	import {getContext, onMount} from 'svelte';
	import {url} from '@roxi/routify';
	import Header from '../../components/Header.svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';
	import Loading from '../../components/Loading.svelte';
	import Button from '../../components/Button.svelte';
	import {storeInfo, getStores} from '../../utils/store.js';

	let ctx = getContext('userInfo');
	let authMsg = null;
	(async () => {
		let info = (await ctx) || null;
		if (!info) return (authMsg = 'NO_USER');
		if (
			!info.scopes.includes(
				'https://www.googleapis.com/auth/classroom.courses.readonly',
			)
		)
			authMsg = 'CLASSROOM';
	})();

	const newItems = [
		{img: '/shop_images/beans.png', price: 15, name: 'Beans'},
		{img: '/shop_images/blahaj.webp', price: 17.99, name: 'Blahaj'},
		{
			img: '/shop_images/supreme_brick.png',
			price: 300,
			name: 'Supreme Brick',
		},
		{
			img: '/shop_images/pro_display_stand.jpeg',
			price: 999,
			name: 'Pro Stand',
		},
		{img: '/shop_images/banana.png', price: 20000, name: 'Banana'},
	];
</script>

<!-- Head -->
<Header sticky />

<!-- Content -->
<div class="p-6 mt-6">
	<h2 class="text-4xl font-bold mb-6">Your Stores</h2>
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
	{#await getStores()}
		<h2>Loading...</h2>
	{:then stores}
		{#if stores.length > 0}
			<div
				class="bg-gray-200 rounded-md filter drop-shadow-md flex overflow-x-auto space-x-3.5 p-4 max-w-min"
			>
				{#each stores as store}
					<a
						href={$url('./:store', {store: store._id})}
						class="p-2 {store.canManage
							? 'bg-yellow-200 hover:bg-yellow-300'
							: 'bg-blue-200 hover:bg-blue-300'} transition-colors duration-150 rounded-lg border-2 border-gray-400 min-w-max"
					>
						<p class="text-2xl font-semibold leading-relaxed">
							{store.name}
						</p>
						{#if store.description}
							<p>
								{store.description}
							</p>
						{/if}
						<p class="italic">
							{#if store.public}
								Available to everyone
							{:else if store.className}
								For {store.className}
							{:else}
								Private
							{/if}
							{#if store.canManage} | You can manage{/if}
						</p>
					</a>
				{/each}
			</div>
		{:else}
			<h2>No stores available</h2>
		{/if}
	{:catch}
		<h2>Error loading stores</h2>
	{/await}

	{#if newItems.length != 0}
		<div class="p-6 mt-12">
			<h2 class="text-4xl font-bold mb-6">New Arrivals</h2>
			<div class="bg-gray-200 rounded-md filter drop-shadow-md">
				<ItemDisplay items={newItems} />
			</div>
		</div>
	{/if}
</div>
