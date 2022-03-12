<script>
	import {getContext} from 'svelte';
	import {Loading} from '.';
	import {getNewArrivals, getStores, LOW_STOCK} from '../utils/store';

	let ctx = getContext('userInfo');
	let userInfo;
	(async () => {
		userInfo = (await ctx) || null;
		if (!userInfo) return;
	})();

	let newArrivals = undefined;
	let stores = [];
	(async () => {
		stores = await getStores();
		newArrivals = await getNewArrivals().catch(e => e);
		if (Array.isArray(newArrivals))
			newArrivals.sort((a, b) => a.name.localeCompare(b.name));
		setTimeout(checkShouldScroll, 0);
	})();

	let carousel, showNextBtn, carouselItemWidth;
	let showLeftBtn = false;
	let showRightBtn = true;
	function checkShouldScroll() {
		if (!carousel.lastChild) return;
		showNextBtn =
			carousel.scrollWidth -
				carousel.scrollLeft -
				carousel.lastChild.clientWidth +
				100 >
			carousel.clientWidth;
		showLeftBtn = carousel.scrollLeft > 0;
		showRightBtn =
			carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth;
	}

	function scrollCarouselLeft() {
		carousel.scrollLeft -= carouselItemWidth;
		checkShouldScroll();
	}

	function scrollCarouselRight() {
		carousel.scrollLeft += carouselItemWidth;
		checkShouldScroll();
	}

	window.addEventListener('resize', checkShouldScroll);
</script>

{#if Array.isArray(newArrivals) && newArrivals.length > 0}
	<div class="flex items-center relative">
		<button
			class="btn btn-circle aspect-square absolute left-4 transition-opacity duration-300 z-50 !animation-unset"
			class:opacity-0={!showLeftBtn}
			on:click={scrollCarouselLeft}
		>
			<span class="icon-arrow-left text-2xl" />
		</button>
		<div
			class="carousel gap-4 rounded-lg"
			bind:this={carousel}
			on:scroll={checkShouldScroll}
		>
			{#each newArrivals as item}
				<a
					class="w-80 carousel-item p-4 bg-base-100 shadow rounded-lg flex flex-col flex-grow transition duration-300"
					href="/store/{item.storeID}#{item.id}"
					bind:clientWidth={carouselItemWidth}
				>
					<div class="flex flex-row justify-between items-center">
						<div class="flex text-3xl font-semibold items-center">
							<span>{item.name}</span>
						</div>
					</div>
					<p
						class="text-2xl font-semibold {userInfo !== null &&
						userInfo.balance < item.price
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
								<span class="text-red-500">Out of stock</span>
							{:else if item.quantity <= LOW_STOCK}
								<span class="text-yellow-400"
									>Only {item.quantity.toLocaleString()}
									left!</span
								>
							{:else}
								<span class="text-green-400">In stock</span>
								- {item.quantity.toLocaleString()} left
							{/if}
						</p>
					{/if}
					{#if item.description}
						<p class="text-xl mt-2 whitespace-pre-wrap italic">
							{item.description}
						</p>
					{/if}
					<p class="flex-grow" />
					{#if item.imageHash}
						<img
							class="store-item mt-6 object-contain max-h-60 rounded-lg"
							src="/api/store/{item.storeID}/item/{item._id}/image"
							alt={item.name}
							onload="this.style.display = ''"
							onerror="this.style.display = 'none'"
						/>
					{/if}
				</a>
			{/each}
		</div>
		<button
			class="btn btn-circle aspect-square absolute right-4 transition-opacity duration-300 z-50 !animation-unset"
			class:opacity-0={!showRightBtn}
			on:click={scrollCarouselRight}
		>
			<span class="icon-arrow-right text-2xl" />
		</button>
	</div>
	<span
		class:opacity-0={!showNextBtn}
		class="transition-opacity duration-300 block mt-2"
		>Scroll for more <span class="icon-arrow-right" /></span
	>
{:else}
	<div class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40">
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
