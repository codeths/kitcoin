<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import {Transactions, Loading} from '../../components';
	import {getBalance} from '../../utils/api.js';

	metatags.title = 'Student Home - Kitcoin';

	let ctx = getContext('userInfo');
	let userInfo;
	(async () => {
		userInfo = (await ctx) || null;
		if (!userInfo) return;
		if (!userInfo.roles.includes('STUDENT')) window.location.reload();
	})();
</script>

<!-- Content-->
<div class="mx-8 my-4">
	<div class="grid grid-cols-12">
		<div class="mx-2 my-4 col-span-12 md:col-span-8 lg:col-span-6">
			<h1 class="text-3xl font-medium mb-2">Balance</h1>
			<div
				class="flex bg-base-100 shadow-md rounded py-10 min-h-40 border-t-8 border-primary"
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
		<div class="mx-2 my-4 col-span-12">
			<h1 class="text-4xl font-medium mb-2">Transaction History</h1>
			<div class="bg-base-100 shadow-md rounded px-8 py-8">
				<Transactions />
			</div>
		</div>
	</div>
</div>
