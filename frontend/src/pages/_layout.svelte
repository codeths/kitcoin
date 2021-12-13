<script>
	import {getContext, onMount} from 'svelte';
	import {isActive} from '@roxi/routify';
	import _transition from './_transition.svelte';

	let links = [];
	let homes = [];
	let ctx = getContext('userInfo');
	let userInfo;

	let homePath = '/';

	onMount(async () => {
		userInfo = (await ctx) || null;
		const roles = userInfo?.roles || [];
		if (roles.includes('ADMIN')) homes.push(['Admin Home', '/admin']);
		if (roles.includes('STAFF')) homes.push(['Staff Home', '/staff']);
		if (roles.includes('STUDENT')) homes.push(['Student Home', '/student']);
		links.push(['Home', (homes[0] || [, '/'])[1]]);
		homePath = links[0][1];

		links.push(['Store', '/store']);

		homes = homes;
		links = links;
	});

	function formatLink(link) {
		if (link == '/') return '/index';

		return link;
	}
</script>

<div class="drawer h-screen">
	<input id="nav-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex flex-col">
		<div class="navbar w-full bg-blue-eths text-white p-3 shadow-xl h-16">
			<div class="navbar-start">
				<a href={homePath} class="mx-2">
					<h2 class="text-4xl">
						<span class="icon-logo mr-1" />Kitcoin
					</h2></a
				>
				<div class="hidden md:flex mx-2 nav-links-parent">
					{#each links as [text, link, navigate]}
						<a
							class="btn btn-ghost rounded !bg-transparent btn-sm text-xl font-medium nav-link focus-visible:outline-webkit p-1 m-1 h-auto"
							target={navigate ? '_self' : null}
							class:active={$isActive(formatLink(link))}
							href={link}>{text}</a
						>
					{/each}
				</div>
			</div>
			<div class="navbar-end">
				<div class="dropdown dropdown-end hidden md:inline-block">
					<div class="btn btn-ghost" tabindex="0">
						<span
							class="{userInfo
								? 'icon-user'
								: 'icon-user-slash'} text-4xl"
						/>
					</div>
					<ul
						tabindex="0"
						class="p-2 shadow menu dropdown-content bg-base-200 text-base-content rounded-box w-52"
					>
						{#if userInfo}
							{#if homes.length > 1}
								{#each homes as [text, link]}
									<li>
										<a
											class="px-3 py-1 {$isActive(link)
												? '!cursor-not-allowed bg-base-300 hover:active:bg-base-300'
												: ''}"
											href={link}
											disabled={$isActive(
												formatLink(link),
											)}>{text}</a
										>
									</li>
								{/each}
								<div
									class="divider my-0 before:bg-base-300 after:bg-base-300"
								/>
							{/if}
							<li>
								<a
									class="px-3 py-1"
									href="/signout"
									target="_self">Sign Out</a
								>
							</li>
						{:else}
							<a class="px-3 py-1" href="/signin" target="_self"
								>Sign In</a
							>
						{/if}
					</ul>
				</div>
				<div class="flex md:hidden">
					<label for="nav-drawer" class="btn btn-square btn-ghost">
						<span class="icon-menu text-4xl" />
					</label>
				</div>
			</div>
		</div>
		<div class="flex grow relative">
			<slot decorator={_transition} />
		</div>
	</div>
	<div class="drawer-side">
		<label for="nav-drawer" class="drawer-overlay" />
		<div class="p-4 overflow-y-auto menu w-80 bg-base-100">
			<label
				for="nav-drawer"
				class="btn btn-ghost btn-square p-1 self-end font-medium"
			>
				<span class="icon-close text-4xl" /></label
			>
			<li>
				{#each links as [text, link, navigate]}
					<li>
						<a
							class:bg-base-300={$isActive(formatLink(link))}
							target={navigate ? '_self' : null}
							href={link}>{text}</a
						>
					</li>
				{/each}
				<div
					class="divider my-0 before:bg-base-300 after:bg-base-300"
				/>
				{#if userInfo}
					{#if homes.length > 1}
						{#each homes as [text, link]}
							<li>
								<a
									class="px-3 py-1 {$isActive(
										formatLink(link),
									)
										? '!cursor-not-allowed bg-base-300 hover:active:bg-base-300'
										: ''}"
									href={link}
									disabled={$isActive(formatLink(link))}
									>{text}</a
								>
							</li>
						{/each}
						<div
							class="divider my-0 before:bg-base-300 after:bg-base-300"
						/>
					{/if}
					<li>
						<a class="px-3 py-1" href="/signout" target="_self"
							>Sign Out</a
						>
					</li>
				{:else}
					<a class="px-3 py-1" href="/signin" target="_self"
						>Sign In</a
					>
				{/if}
			</li>
		</div>
	</div>
</div>
