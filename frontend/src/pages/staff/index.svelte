<script>
	import Header from '../../components/Header.svelte';
	import {getBalance, getTransactions} from '../../utils/api.js';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	console.log('Hello Staff!!');
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200" />
<Header />

<!-- Content -->
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
			<h1 class="text-3xl font-medium mb-2">Overview</h1>
			<div class="bg-white shadow-md rounded">
				<div class="p-4">
					<div class="p-2">
						<p class="text-gray-700 mb-3">
							To help Kitcoin retain its value, you can only give
							your students a set amount each month. This changes
							depending on a number of factors.
						</p>
						<p class="text-gray-700">
							When you're finished, click "Reward Students" to
							award it to your students instantly. If you want to
							create a new task for your students, click "Create
							New Task".
						</p>
					</div>
					<div>
						<button>Select your amount</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
