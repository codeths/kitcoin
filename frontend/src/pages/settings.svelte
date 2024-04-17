<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import {Loading} from '../components';
	import {getUserInfo, toggleEmailStatus} from '../utils/api.js';

	metatags.title = 'Settings - Kitcoin';

	let ctx = getContext('userInfo');
	let usrInfo;
	(async () => {
		usrInfo = (await ctx) || null;
		if (!usrInfo) return;
	})();

	let promise = getUserInfo();
</script>

<!-- Content-->
<div class="mx-8 my-4">
	<h1 class="text-3xl font-medium mb-2">Email Settings</h1>
	{#await promise}
		<Loading height="2rem" />
	{:then userInfo}
		<p class="text-xl font-medium">
			You are currently set
			{#if !userInfo.emails}
				not
			{/if}
			to receive emails regarding Kitcoin.
		</p>
		<button
			class="btn btn-primary self-end px-12 mx-1 modal-button"
			on:click={() =>
				toggleEmailStatus().then(() => {
					promise = getUserInfo();
				})}
		>
			Opt
			{#if !userInfo.emails}
				in to
			{:else}
				out of
			{/if}
			receiving emails
		</button>
	{:catch error}
		{error}
	{/await}
</div>
