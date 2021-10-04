<script>
	/*
	  Item: {incoming: true, user: 'John Doe', amount: 10, date: 'ISO Date', reason: 'Reason'}
	*/
	export let items = []; // An array of items. (See above)
</script>

<div class="p-4 bg-white rounded shadow-md flex">
	{#if items.length != 0}
		<table class="w-full table-auto transactions">
			<thead>
				<tr class="text-left">
					<th class="px-2"></th>
					<th>Date</th>
					<th>From</th>
					<th>To</th>
					<th>Reason</th>
					<th>Amount</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item}
				<tr class="border-t-2 border-gray-300">
					<td class="px-2 text-center">
						{#if item.incoming}&rarr;{:else}&larr;{/if}
					</td>
					<td>
						{new Date(item.date).toLocaleString()}
					</td>
					<td>
						{#if item.incoming}{item.user}{:else}Me{/if}
					</td>
					<td>
						{#if item.incoming}Me{:else}{item.user}{/if}
					</td>
					<td>{item.amount}</td>
					<td>{item.reason || 'None'}</td>
				</tr>
				{/each}
			</tbody>
		</table> {:else}!
		<h1>No transactions</h1>
	{/if}
</div>
