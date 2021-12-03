<script>
	import {getContext, onMount} from 'svelte';
	import Header from '../../components/Header.svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';
	import Loading from '../../components/Loading.svelte';
	import Button from '../../components/Button.svelte';

	let stores = [];

	const categories = [
		//TODO: Use an image instead of a color for the background?
		//Be sure to add any colors used to Tailwind's safelist (Ex: 'from-{color}-300' and 'to-{color}-200')
		['Blahaj', 'blue'],
		['Food', 'yellow'],
		['Apple', 'green'],
		['Supreme', 'red'],
	];
	const newItems = [
		{img: 'shop_images/beans.png', price: 15, name: 'Beans'},
		{img: 'shop_images/blahaj.webp', price: 17.99, name: 'Blahaj'},
		{
			img: 'shop_images/supreme_brick.png',
			price: 300,
			name: 'Supreme Brick',
		},
		{
			img: 'shop_images/pro_display_stand.jpeg',
			price: 999,
			name: 'Pro Stand',
		},
		{img: 'shop_images/banana.png', price: 20000, name: 'Banana'},
	];

	async function getStores() {
		let res = await fetch('/api/stores');
		if (!res || !res.ok) throw new Error('Failed to fetch stores');
		return await res.json();
	}

	let selectedStore = null;
	let loading = false;
	let error;
	let items = null;
	let currentPage = 1;

	async function load(store, page, which = true) {
		try {
			if (store) {
				if (selectedStore !== store) items = null;
				selectedStore = store;
			}
			loading = which;
			let res = await fetch(
				`/api/store/${selectedStore._id}/items?page=${page}&count=12`,
			).catch(e => {});
			loading = false;
			if (!res || !res.ok) throw new Error('Failed to fetch items');
			error = false;
			items = await res.json();
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
<div class="bg-blue-100">
	<div
		class="py-28 md:py-36 lg:py-44 xl:py-56 mx-auto text-center max-w-7xl px-2"
	>
		<h1 class="text-6xl font-black">Welcome to the Kitcoin Store!!</h1>
		<br />
		<p class="text-3xl text-gray-700">
			Here you can buy lots of cool stuff with your hard earned Kitcoin.
			Check out our awesome selection of Beans&trade; and get your Supreme
			Bricks while they're still in stock!
		</p>
	</div>
</div>

<div class="p-6 mt-6">
	{#await getStores()}
		Loading...
	{:then stores}
		{#if stores.length > 0}
			<h2 class="text-4xl font-bold mb-6">Your Stores</h2>
			<div
				class="bg-gray-200 rounded-md filter drop-shadow-md flex overflow-x-auto space-x-3.5 p-4 max-w-min"
			>
				{#each stores as store}
					<button
						on:click={() => load(store, 1)}
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
					</button>
				{/each}
			</div>
		{:else}
			<h2>No stores available</h2>
		{/if}
	{:catch}
		<h2>Error loading stores</h2>
	{/await}
</div>

{#if selectedStore}
	<div class="p-6 mt-12">
		<h2 class="text-4xl font-bold mb-6">{selectedStore.name}</h2>
		{#if error || !items || items.docCount == 0}
			<h2>
				{#if error}
					An Error Occured
				{:else}
					No Items
				{/if}
			</h2>
			<br />
			<Button
				on:click={() => load(null, currentPage ?? 1, 'refresh')}
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
		{:else}
			<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each items.items as item}
					<div class="p-4 border shadow">
						<p class="text-3xl font-semibold text-gray-800">
							{item.name}
						</p>
						{#if item.description}
							<p class="text-xl mt-4">
								{item.description}
							</p>
						{/if}
					</div>
				{/each}
			</div>
			<div class="pt-4">
				<div class="text-center mb-2">
					Showing page {items.page} of {items.pageCount}
				</div>
				<div class="flex justify-center align-center">
					<Button
						on:click={() => load(null, currentPage - 1, 'previous')}
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
						on:click={() => load(null, currentPage + 1, 'next')}
						class="mx-2"
						disabled={loading || currentPage >= items.pageCount}
					>
						{#if loading == 'next'}
							<Loading height="2rem" />
						{:else}
							Next
						{/if}
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}

{#if categories.length != 0}
	<div class="p-6 mt-12">
		<h2 class="text-4xl font-bold mb-6">Categories</h2>
		<div class="lg:grid lg:grid-cols-4 gap-10 space-y-10 lg:space-y-0">
			{#each categories as [category, color]}
				<div
					class="relative h-72 lg:h-80 xl:h-96 bg-gradient-to-t from-{color ||
						'gray'}-300 to-{color ||
						'gray'}-200 rounded-xl max-w-screen-md lg:max-w-none mx-auto lg:mx-0 filter drop-shadow-md"
				>
					<p
						class="text-3xl font-semibold absolute bottom-0 mx-8 lg:mx-12 mb-12 text-gray-800"
					>
						{category}
					</p>
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if newItems.length != 0}
	<div class="p-6 mt-12">
		<h2 class="text-4xl font-bold mb-6">New Arrivals</h2>
		<div class="bg-gray-200 rounded-md filter drop-shadow-md">
			<ItemDisplay items={newItems} />
		</div>
	</div>
{/if}
