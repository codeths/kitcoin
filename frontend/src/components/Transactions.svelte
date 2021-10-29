<script>
	/*
	  Transaction object
	*/
	import {getTransactions} from '../utils/api.js';

	export let user; // An array of items.
	let page = 1;
</script>

<div
	class="w-full p-4 bg-white rounded shadow-md flex flex-col divide-y divide-gray-300"
>
	{#await getTransactions(user, page)}
		<h1>Loading...</h1>
	{:then transactions}
		{#if transactions.length != 0}
			<table class="w-full table-auto">
				<thead class="hidden md:table-header-group w-full">
					<tr class="text-left border-b border-gray-300">
						<th class="px-2 pb-2">Date</th>
						<th class="px-2 pb-2">Description</th>
						<th class="px-2 pb-2">Amount</th>
					</tr>
				</thead>
				<tbody class="w-full divide-y divide-gray-300">
					{#each transactions as item}
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
									? `From ${item.from.text || 'Unknown'}`
									: `To ${
											item.to.text || 'Unknown'
									  }`}{item.reason ? `: ${item.reason}` : ''}
							</td>
							<td
								class="px-2 pb-4 md:py-4 block md:table-cell text-right text-3xl md:text-left md:text-base {item.amount <
								0
									? 'text-orange-eths'
									: 'text-blue-eths'}"
								>{item.amount < 0 ? '-' : '+'}<span
									class="icon icon-currency mx-1"
								/>{Math.abs(item.amount).toLocaleString()}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<h1>No transactions.</h1>
		{/if}
	{:catch error}
		{error}
	{/await}
	<button on:click={() => page--}>Previous</button>
	<button on:click={() => page++}>Next</button>
</div>
