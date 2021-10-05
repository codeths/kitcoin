<script>
	import NewItems from './NewItems.svelte';
	import Transactions from './Transactions.svelte';

	const balance = 42069;
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

	const transactions = [
		{
			from: {
				id: 'abcdef',
				text: 'Jeff',
				me: true,
			},
			to: {
				id: 'abcdef',
				text: 'Wildkit Store',
				me: false,
			},
			amount: -15,
			date: '2021-10-01T16:00:00Z',
			reason: 'Beans',
		},
		{
			from: {
				id: 'abcdef',
				text: 'John Doe',
				me: false,
			},
			to: {
				id: 'abcdef',
				text: 'Jeff',
				me: true,
			},
			amount: 15,
			date: '2021-10-01T00:00:00Z',
			reason: 'Go buy urself some beans lol',
		},
		{
			from: {
				id: 'abcdef',
				text: 'Jeff',
				me: true,
			},
			to: {
				id: 'abcdef',
				text: 'Karen',
				me: false,
			},
			amount: -10,
			date: '2020-01-01T00:00:00Z',
			reason: 'I want to speak with your manager!',
		},
	];
</script>

<header>
	<nav class="bg-blue-900 p-3 flex justify-between items-center shadow-xl">
		<div>
			<h2
				class="text-white font-light text-5xl ml-2 md:ml-4 hidden sm:block"
			>
				Kitcoin 💵
			</h2>
			<h2 class="text-white font-light text-5xl ml-2 sm:hidden">💵</h2>
			<!-- Mobile Logo -->
		</div>
		<div class="flex space-x-8 md:space-x-12 mr-5 md:mr-10">
			<h3 class="text-white font-medium text-3xl border-b-4">Wallet</h3>
			<h3 class="text-white font-medium text-3xl">Store</h3>
		</div>
	</nav>
</header>

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
					$ {balance.toLocaleString()}
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
			<Transactions items={transactions} />
		</div>
	</div>
</div>
