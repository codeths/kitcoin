<script>
	import {getContext} from 'svelte';
	import {url, metatags} from '@roxi/routify';
	import {Loading} from '../../components';
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
									class="tooltip tooltip-left"
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
							{:else if store.classNames.length > 0}
								For {store.classNames.join(', ')}
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
</div>
