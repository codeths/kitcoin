<script>
	import {getContext, onMount} from 'svelte';
	import {url} from '@roxi/routify';
	import Button from '../components/Button.svelte';

	let links = [];
	let homes = [];
	let ctx = getContext('userInfo');
	let userInfo;
	let current = $url() || '/';

	onMount(async () => {
		userInfo = (await ctx) || null;
		const roles = userInfo?.roles || [];
		if (roles.includes('ADMIN')) homes.push(['Admin Home', '/admin']);
		if (roles.includes('STAFF')) homes.push(['Staff Home', '/staff']);
		if (roles.includes('STUDENT')) homes.push(['Student Home', '/student']);
		links.push(['Home', (homes[0] || [, '/'])[1]]);

		links.push(['Store', userInfo ? '/store' : ['/signin', true]].flat());

		homes = homes;
		links = links;
	});

	let dropEl;
	let userDrop = false;

	document.addEventListener('click', e => {
		if (dropEl && dropEl !== e.target && !dropEl.contains(e.target))
			userDrop = false;
	});
</script>

<header>
	<nav
		class="w-full bg-blue-eths text-white p-3 flex justify-between items-center shadow-xl"
	>
		<div>
			<a href="/">
				<h2
					class="text-white font-light text-5xl ml-2 md:ml-4 flex justify-center items-center"
				>
					<span class="icon icon-logo mr-1" />Kitcoin
				</h2></a
			>
		</div>
		<div class="flex md:hidden">
			<!-- TODO: Menu bar collapse -->
		</div>
		<div class="hidden md:flex space-x-8 md:space-x-12 md:pr-4">
			{#each links as [text, link, navigate]}
				<a
					class="text-white font-medium text-3xl"
					target={navigate ? '_self' : null}
					class:border-b-4={link == current}
					href={link}>{text}</a
				>
			{/each}
			{#if userInfo}
				<div
					class="relative w-48 max-w-full flex flex-col items-stretch"
					bind:this={dropEl}
				>
					<Button
						id="dropdownButton"
						class="rounded-lg px-4 py-2.5 w-auto"
						bgDarkness="700"
						hoverDarkness="800"
						on:click={() => (userDrop = !userDrop)}
					>
						{userInfo.name}
					</Button>
					<div
						style="top: 3rem"
						class="flex focus-within:flex absolute bg-white text-base z-10 list-none divide-y divide-gray-100 rounded shadow w-44 dark:bg-gray-700 w-full"
						class:hidden={!userDrop}
					>
						<ul
							class="py-1 w-full"
							aria-labelledby="dropdownButton"
						>
							{#each homes as [text, link]}
								<li>
									<a
										tabindex="0"
										href={link}
										on:click={() => (userDrop = false)}
										class="text-sm hover:bg-gray-100 text-gray-700 block px-4 py-2"
										class:bg-gray-100={link == current}
										>{text}</a
									>
								</li>
							{/each}
							<li>
								<a
									tabindex="0"
									href="/signout"
									target="_self"
									class="text-sm hover:bg-gray-100 text-gray-700 block px-4 py-2"
									>Sign Out</a
								>
							</li>
						</ul>
					</div>
				</div>
			{:else if userInfo === null}
				<a
					href="/signin"
					target="_self"
					class="text-white font-medium text-3xl">Sign In</a
				>
			{/if}
		</div>
	</nav>
</header>
