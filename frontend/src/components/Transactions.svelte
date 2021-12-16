<script>
	/*
	  Transaction object
	*/
	import {getTransactions} from '../utils/api.js';
	import Loading from './Loading.svelte';

	export let user = undefined;
	let page = 1;
	let transactions = {
		page: 0,
		pageCount: 0,
		docCount: 0,
		transactions: [],
	};
	let error = null;
	let loading = {
		previous: false,
		next: false,
		retry: false,
		any: false,
	};

	async function load(p = page, which) {
		if (which) loading[which] = true;
		await getTransactions(user, p)
			.then(res => {
				error = null;
				(transactions = res), (page = p);
			})
			.catch(e => {
				error = e;
				page = p;
			});

		if (which) loading[which] = false;
	}

	$: {
		if (transactions.page !== page) load(page);
	}

	$: {
		loading.any = Object.keys(loading)
			.filter(x => x !== 'any')
			.some(k => loading[k]);
	}
</script>

<div
	class="w-full p-4 bg-base-200 rounded shadow-md flex flex-col divide-y divide-gray-300"
>
	{#if transactions.pageCount !== 0}
		<table class="w-full table-auto">
			<thead class="hidden md:table-header-group w-full">
				<tr class="text-left border-b border-gray-300">
					<th class="px-2 pb-2">Date</th>
					<th class="px-2 pb-2">Description</th>
					<th class="px-2 pb-2">Amount</th>
				</tr>
			</thead>
			<tbody class="w-full divide-y divide-gray-300">
				{#each transactions.transactions as item}
					<tr>
						<td
							class="px-2 pt-4 md:py-4 block mr-8 md:table-cell md:mr-0 overflow-ellipsis"
						>
							{new Date(item.date).toLocaleDateString()}
							{new Date(item.date).toLocaleTimeString([], {
								hour: 'numeric',
								minute: '2-digit',
							})}
						</td>
						<td
							class="px-2 md:py-4 block md:table-cell break-words overflow-ellipsis"
						>
							{item.to.me
								? `${item.from.id ? 'From ' : ''}${
										item.from.text || 'Unknown'
								  }`
								: `${item.to.id ? 'To ' : ''}${
										item.to.text || 'Unknown'
								  }`}{item.reason ? `: ${item.reason}` : ''}
						</td>
						<td
							class="px-2 pb-4 md:py-4 block md:table-cell text-right text-3xl md:text-left md:text-base {item.amount <
							0
								? 'text-orange-eths'
								: 'text-base-content'}"
							>{#if item.amount < 0}&minus;&nbsp;{/if}<span
								class="icon-currency mr-1"
							/>{Math.abs(item.amount).toLocaleString([], {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<h1>No transactions.</h1>
	{/if}

	{#if error}
		<div class="pt-4">
			<div class="text-center mb-2">
				{error}
			</div>
			<div class="flex justify-center align-center">
				<button
					class="btn btn-primary w-40"
					on:click={() => load(page, 'retry')}
					disabled={loading.any}
				>
					{#if loading.retry}
						<Loading height="2rem" />
					{:else}
						Retry
					{/if}
				</button>
			</div>
		</div>
	{:else}
		<div class="pt-4">
			<div class="text-center mb-2">
				Showing page {transactions.page} of {transactions.pageCount}
			</div>
			<div class="flex justify-center align-center">
				<button
					class="btn btn-primary w-40 mx-2"
					class:bg-base-100={transactions.page <= 1}
					on:click={() => load(page - 1, 'previous')}
					disabled={loading.any || transactions.page <= 1}
				>
					{#if loading.previous}
						<Loading height="2rem" />
					{:else}
						Previous
					{/if}
				</button>
				<button
					class="btn btn-primary w-40 mx-2"
					class:bg-base-100={transactions.page >=
						transactions.pageCount}
					on:click={() => load(page + 1, 'next')}
					disabled={loading.any ||
						transactions.page >= transactions.pageCount}
				>
					{#if loading.next}
						<Loading height="2rem" />
					{:else}
						Next
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
