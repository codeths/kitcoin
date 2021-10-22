<script>
	import NewItems from '../../components/NewItems.svelte';
	import Transactions from '../../components/Transactions.svelte';
	import Header from '../../components/Header.svelte';
	import {getBalance, getTransactions} from '../../utils/api.js';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';

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
</script>

<!-- Head  -->
<SetBodyStyle classString="bg-gray-200" />
<Header />

<!-- Content-->
<div class="mx-14 my-8 lg:mx-24 lg:my-14">
	<div
		class="space-y-10 space-x-0 lg:grid lg:grid-cols-5 lg:space-x-10 lg:space-y-0"
	>
		<div class="lg:col-span-2 sm:max-w-sm lg:max-w-none">
			<h1 class="text-3xl font-medium mb-2">Balance</h1>
			<div
				class="bg-white shadow-md rounded py-10 border-t-8 border-blue-900"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl font-medium"
				>
					{#await getBalance()}
						Loading...
					{:then balance}
						$ {balance.toLocaleString()}
					{:catch error}
						{error}
					{/await}
				</h1>
			</div>
		</div>
		<div class="lg:col-span-3">
			<h1 class="text-3xl font-medium mb-2">What's new</h1>
			<div class="bg-white shadow-md rounded">
				<NewItems items={newItems} />
			</div>
		</div>
	</div>
	<div class="mt-12">
		<h1 class="text-4xl font-medium mb-6">Transaction History</h1>
		<div>
			{#await getTransactions()}
				Loading...
			{:then transactions}
				<Transactions items={transactions} />
			{:catch error}
				{error}
			{/await}
		</div>
	</div>
</div>
