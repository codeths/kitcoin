<script>
	import {getContext} from 'svelte';
	import {url, metatags} from '@roxi/routify';
	import Loading from '../../components/Loading.svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';
	import {getStores} from '../../utils/store.js';

	metatags.title = 'Stores - Kitcoin';

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
	const categories = [
		//These are for the highlighted store (wildkit store)
		//TODO: Use an image instead of a color for the background?
		//Be sure to add any colors used to Tailwind's safelist (Ex: 'from-{color}-300' and 'to-{color}-200')
		['Blahaj', 'blue'],
		['Food', 'yellow'],
		['Apple', 'green'],
		['Supreme', 'red'],
	];
</script>

<!-- Content -->
<div class="p-12 mt-6">
	<h2 class="text-4xl font-bold mb-6">Your Stores</h2>
	{#if authMsg}
		<div class="alert alert-error my-4">
			<div class="flex-1 items-center">
				<span class="icon-warning text-2xl align-middle mr-2" />
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
	{#await getStores()}
		<Loading height="2rem" />
	{:then stores}
		{#if stores.length > 0}
			<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{#each stores as store}
					<a
						href={$url('./:store', {store: store._id})}
						class="group p-4 bg-base-200 hover:bg-primary hover:text-primary-content hover:scale-110 shadow rounded-lg flex flex-col transition duration-300"
					>
						<div class="flex flex-row justify-between items-center">
							<p class="inline-flex text-2xl font-semibold">
								{store.name}
							</p>
							{#if store.canManage}
								<div
									data-tip="You can manage this store"
									class="tooltip"
								>
									<span
										class="inline-flex icon-crown text-2xl h-full text-primary group-hover:text-primary-content"
									/>
								</div>
							{/if}
						</div>
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
		<div class="mt-12">
			<h2 class="text-4xl font-bold mb-6">New Arrivals</h2>
			<div class="bg-base-200 rounded-md filter drop-shadow-md">
				<ItemDisplay items={newItems} />
			</div>
		</div>
	{/if}

	{#if categories.length != 0}
		<!-- Placeholder for now, not a big priority. These would be for the main store -->
		<div class="mt-12">
			<h2 class="text-4xl font-bold mb-6">Categories</h2>
			<div
				class="lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-10 space-y-10 lg:space-y-0"
			>
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
</div>
