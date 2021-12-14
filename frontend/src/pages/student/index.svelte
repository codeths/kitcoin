<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import ItemDisplay from '../../components/ItemDisplay.svelte';
	import Transactions from '../../components/Transactions.svelte';
	import Loading from '../../components/Loading.svelte';
	import {getBalance} from '../../utils/api.js';

	metatags.title = 'Student Home - Kitcoin';

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
	<div class="lg:grid lg:grid-cols-12">
		<div class="lg:col-span-4 sm:max-w-sm lg:max-w-none my-4 lg:mx-2">
			<h1 class="text-3xl font-medium mb-2">Balance</h1>
			<div
				class="flex bg-base-200 shadow-md rounded py-10 min-h-40 border-t-8 border-blue-eths"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
				>
					{#await getBalance()}
						<Loading height="2rem" />
					{:then balance}
						<span
							class="icon-currency mr-1"
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
		<div class="lg:col-span-8 my-4 lg:mx-2">
			<h1 class="text-3xl font-medium mb-2">What's new</h1>
			<div class="bg-base-200 shadow-md rounded">
				<ItemDisplay items={newItems} />
			</div>
		</div>
		<div class="lg:col-span-12 my-4 lg:mx-2">
			<h1 class="text-4xl font-medium mb-2">Transaction History</h1>
			<div>
				<Transactions />
			</div>
		</div>
	</div>
</div>
