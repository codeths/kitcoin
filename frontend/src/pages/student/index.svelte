<script>
	import NewItems from '../../components/NewItems.svelte';
	import Transactions from '../../components/Transactions.svelte';
	import Header from '../../components/Header.svelte';
	import {getBalance, getTransactions} from '../../utils/api.js';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	import Auth from '../../utils/Auth.svelte';

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
<Auth />
<Header />

<!-- Content-->
<div class="m-8">
	<div class="lg:grid lg:grid-cols-12">
		<div class="lg:col-span-4 sm:max-w-sm lg:max-w-none my-8 lg:mx-2">
			<h1 class="text-3xl font-medium mb-2">Balance</h1>
			<div
				class="flex bg-white shadow-md rounded py-10 border-t-8 border-blue-eths"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full"
				>
					{#await getBalance()}
						Loading...
					{:then balance}
						<span
							class="icon icon-currency mr-3"
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
		<div class="lg:col-span-8 my-8 lg:mx-2">
			<h1 class="text-3xl font-medium mb-2">What's new</h1>
			<div class="bg-white shadow-md rounded">
				<NewItems items={newItems} />
			</div>
		</div>
		<div class="lg:col-span-12 my-8 lg:mx-2">
			<h1 class="text-4xl font-medium mb-2">Transaction History</h1>
			<div>
				<Transactions />
			</div>
		</div>
	</div>
</div>
