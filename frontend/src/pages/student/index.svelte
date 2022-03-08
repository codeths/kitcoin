<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import {Transactions, Loading} from '../../components';
	import {getBalance} from '../../utils/api.js';
	import {getNewArrivals, getStores, LOW_STOCK} from '../../utils/store';

	metatags.title = 'Student Home - Kitcoin';

	let ctx = getContext('userInfo');
	let userInfo;
	(async () => {
		userInfo = (await ctx) || null;
		if (!userInfo) return;
		if (!userInfo.roles.includes('STUDENT')) window.location.reload();
	})();

	let newArrivals = undefined;
	let stores = [];
	(async () => {
		stores = await getStores();
		newArrivals = await getNewArrivals().catch(e => e);
		setTimeout(checkShouldScroll, 0);
	})();

	let carousel, showNextBtn;
	function checkShouldScroll() {
		showNextBtn =
			carousel.scrollWidth -
				carousel.scrollLeft -
				carousel.lastChild.clientWidth >
			carousel.clientWidth;
	}
</script>

<!-- Content-->
<div class="mx-8 my-4">
	<div class="grid grid-cols-12">
		<div class="mx-2 my-4 col-span-12 md:col-span-8 lg:col-span-6">
			<h1 class="text-3xl font-medium mb-2">Balance</h1>
			<div
				class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40 border-t-8 border-primary"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
				>
					{#await getBalance()}
						<Loading height="2rem" />
					{:then balance}
						<span
							class="icon-currency mr-3"
						/>{balance.toLocaleString([], {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					{:catch error}
						{error}
					{/await}
				</h1>
			</div>
		</div>
		<div class="mx-2 my-4 col-span-12 lg:col-span-6">
			<h1 class="text-3xl font-medium mb-2">New Arrivals</h1>
			{#if Array.isArray(newArrivals) && newArrivals.length > 0}
				<div
					class="carousel gap-4 rounded-lg"
					bind:this={carousel}
					on:scroll={checkShouldScroll}
				>
					{#each newArrivals as item}
						<a
							class="min-w-[20rem] carousel-item p-4 bg-base-100 shadow rounded-lg flex flex-col flex-grow transition duration-300"
							href="/store/{item.storeID}#{item.id}"
						>
							<div
								class="flex flex-row justify-between items-center"
							>
								<div
									class="flex text-3xl font-semibold items-center"
								>
									<span>{item.name}</span>
								</div>
							</div>
							<p
								class="text-2xl font-semibold {userInfo !==
									null && userInfo.balance < item.price
									? 'text-red-500'
									: ''}"
							>
								<span
									class="icon-currency mr-1"
								/>{item.price.toLocaleString([], {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</p>
							{#if item.quantity != null}
								<p class="text-xl font-bold">
									{#if item.quantity == 0}
										<span class="text-red-500"
											>Out of stock</span
										>
									{:else if item.quantity <= LOW_STOCK}
										<span class="text-yellow-400"
											>Only {item.quantity.toLocaleString()}
											left!</span
										>
									{:else}
										<span class="text-green-400"
											>In stock</span
										>
										- {item.quantity.toLocaleString()} left
									{/if}
								</p>
							{/if}
							{#if item.description}
								<p
									class="text-xl mt-2 whitespace-pre-wrap italic"
								>
									{item.description}
								</p>
							{/if}
							<p class="flex-grow" />
							{#if item.imageHash}
								<img
									class="store-item mt-6 object-contain max-h-80"
									src="/api/store/{item.storeID}/item/{item._id}/image"
									alt={item.name}
									onload="this.style.display = ''"
									onerror="this.style.display = 'none'"
								/>
							{/if}
						</a>
					{/each}
				</div>
				<span
					class:opacity-0={!showNextBtn}
					class="transition-opacity duration-300 block mt-2"
					>Scroll for more <span class="icon-arrow-right" /></span
				>
			{:else}
				<div
					class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40"
				>
					<span
						class="text-center text-3xl flex justify-center items-center w-full h-full"
					>
						{#if Array.isArray(newArrivals)}
							Nothing new!
						{:else if newArrivals === undefined}
							<Loading height="2rem" />
						{:else}
							{newArrivals}
						{/if}
					</span>
				</div>
			{/if}
		</div>
		<div class="mx-2 my-4 col-span-12">
			<h1 class="text-3xl font-medium mb-2">Transaction History</h1>
			<div class="bg-base-100 shadow-md rounded-lg px-8 py-8">
				<Transactions />
			</div>
		</div>
	</div>
</div>
