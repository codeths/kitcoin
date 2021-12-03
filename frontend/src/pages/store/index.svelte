<script>
	import {getContext, onMount} from 'svelte';
	import Header from '../../components/Header.svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';

	let stores = [];
	let publicStores = [];
	let privateStores = [];

	(async () => {
		let res = await fetch('/api/stores');
		try {
			if (res && res.ok) stores = await res.json();
		} catch (e) {}
	})();

	$: {
		publicStores = stores.filter(x => x.public);
		privateStores = stores.filter(x => !x.public);
	}

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

{#if stores.length > 0}
	{#each [['Public', publicStores], ['Private', privateStores]] as [category, stores]}
		{#if stores.length > 0}
			<div class="p-6 mt-6">
				<h2 class="text-4xl font-bold mb-6">{category} Stores</h2>
				<div
					class="bg-gray-200 rounded-md filter drop-shadow-md flex overflow-x-auto space-x-3.5 p-4 max-w-min"
				>
					{#each stores as store}
						<div
							class="p-2 bg-blue-200 hover:bg-blue-300 transition-colors duration-150 rounded-lg border-2 border-gray-400 min-w-max"
						>
							<p class="text-2xl font-semibold leading-relaxed">
								{store.name}
							</p>
							{#if store.description}
								<p class="italic">
									{store.description}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
{:else}
	<h2>No stores available</h2>
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
