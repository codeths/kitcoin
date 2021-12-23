<script>
	import {onMount, onDestroy} from 'svelte';
	export let items = []; // An array of items. (See above)
	let scrollElement;
	let buttonStates = {
		left: true,
		right: true,
	};
	let offset = 0;
	let maxOffset = 0;
	const scrollAmount = 200; //Distance to scroll when button is pressed, in pixels
	let resizeObserver;
	let widthInterval;
	let overflowed = true;

	const btnCheck = () => {
		maxOffset = scrollElement.scrollWidth - scrollElement.clientWidth;
		overflowed = scrollElement.clientWidth != scrollElement.scrollWidth;

		const trueOffset = scrollElement.scrollLeft;
		if (trueOffset < maxOffset) buttonStates.right = false;
		if (trueOffset > 0) buttonStates.left = false;
		if (trueOffset == 0) buttonStates.left = true;
		if (trueOffset == maxOffset) buttonStates.right = true;
	};
	/**
	 * @todo Improve scroll handling
	 */
	const handleClick = btn => {
		switch (btn) {
			case 'left':
				if (offset - scrollAmount < 0) {
					offset = 0;
				} else {
					offset -= scrollAmount;
				}
				break;
			case 'right':
				if (offset + scrollAmount > maxOffset) {
					offset = maxOffset;
				} else {
					offset += scrollAmount;
				}
				break;
		}
		btnCheck();
		scrollElement.scroll({left: offset, top: 0, behavior: 'smooth'});
	};

	onMount(() => {
		if (scrollElement) {
			maxOffset = scrollElement.scrollWidth;
			if (window.ResizeObserver) {
				resizeObserver = new ResizeObserver(btnCheck);
				resizeObserver.observe(scrollElement);
			} else {
				widthInterval = setInterval(btnCheck, 2500);
			}
		}
	});
	onDestroy(() => {
		if (resizeObserver) resizeObserver.unobserve(scrollElement);
		if (widthInterval) clearInterval(widthInterval);
	});
</script>

<div class="p-4 flex">
	<button
		class="p-auto px-2 flex-shrink-0 sm:block hidden"
		class:opacity-40={buttonStates.left}
		disabled={buttonStates.left}
		on:click={() => handleClick('left')}
	>
		<img src="/assets/arrow_left.png" alt="&larr" class="h-10 w-10" />
	</button>
	<div class="flex-grow overflow-hidden">
		{#if items.length != 0}
			<div
				class="flex overflow-x-auto"
				class:justify-evenly={!overflowed}
				bind:this={scrollElement}
				on:scroll={() => {
					offset = scrollElement.scrollLeft;
					btnCheck();
				}}
			>
				{#each items as item}
					<div
						class="flex-shrink-0 m-6 flex flex-col justify-between"
						style="max-width: 14rem;"
					>
						<img
							src={item.img}
							alt={item.name}
							style="max-width: 13rem; max-height: 13rem; width: max-content;"
						/>
						<div>
							<h2 class="text-lg text-gray-600">{item.name}</h2>
							<h1
								class="text-2xl font-bold flex items-center justify-start"
							>
								<span
									class="icon-currency mr-1"
								/>{item.price.toLocaleString()}
							</h1>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<h1 class="text-4xl text-center my-16 italic text-gray-500">
				Nothing to show
			</h1>
		{/if}
	</div>
	<button
		class="p-auto px-2 flex-shrink-0 sm:block hidden"
		class:opacity-40={buttonStates.right}
		disabled={buttonStates.right}
		on:click={() => handleClick('right')}
	>
		<img
			src="/assets/arrow_left.png"
			alt="&larr"
			class="h-10 w-10 transform rotate-180"
		/>
	</button>
</div>
