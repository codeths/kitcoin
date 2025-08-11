<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import {Loading} from '../../components';
	import {getUserInfo, toggleEmailStatus} from '../../utils/api.js';

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
	<h1 class="text-4xl font-bold mb-3">Settings</h1>
	<div class="mx-2">
		<h1 class="text-3xl font-medium mb-2">Emails</h1>
		{#await promise}
			<Loading height="2rem" />
		{:then userInfo}
			<p class="text-xl font-medium mb-2">
				You are currently set
				{#if !userInfo.emails}
					<span class="font-bold">not</span>
				{/if}
				to receive emails regarding Kitcoin.
			</p>
			<button
				class="btn btn-primary px-6"
				on:click={() =>
					toggleEmailStatus().then(() => {
						promise = getUserInfo();
					})}
			>
				Turn emails
				{#if !userInfo.emails}
					on
				{:else}
					off
				{/if}
			</button>
		{:catch error}
			{error}
		{/await}
	</div>
</div>
