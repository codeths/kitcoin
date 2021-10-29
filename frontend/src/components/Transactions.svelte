<script>
	/*
	  Transaction object
	*/
	import Icon from './Icon.svelte';

	export let items = []; // An array of items.

	let filteredItems = items;

	function updateFilter() {
		filteredItems = items;
		const incoming = document.getElementById('filter-incoming').value;
		const min = document.getElementById('filter-min').value;
		const max = document.getElementById('filter-max').value;
		const search = document.getElementById('filter-text').value;
		const before = document.getElementById('filter-before').value;
		const after = document.getElementById('filter-after').value;
		const beforeDate = before ? new Date(`${before}T00:00:00`) : null;
		const afterDate = after ? new Date(`${after}T24:00:00`) : null;

		if (incoming !== 'all')
			filteredItems = filteredItems.filter(item => item[incoming].me);
		if (min !== '')
			filteredItems = filteredItems.filter(
				item => Math.abs(item.amount) >= min,
			);
		if (max !== '')
			filteredItems = filteredItems.filter(
				item => Math.abs(item.amount) <= max,
			);
		if (search !== '')
			filteredItems = filteredItems.filter(item =>
				[
					!item.from.me ? item.from.text : '',
					!item.to.me ? item.to.text : '',
					item.reason,
				].some(x => x.toLowerCase().includes(search.toLowerCase())),
			);
		if (beforeDate && !isNaN(beforeDate))
			filteredItems = filteredItems.filter(
				item => new Date(item.date).getTime() > beforeDate.getTime(),
			);
		if (afterDate && !isNaN(afterDate))
			filteredItems = filteredItems.filter(
				item => new Date(item.date).getTime() < afterDate.getTime(),
			);
	}
</script>

<div class="pb-2">
	<!-- TODO: show/hide -->
	<span>Type:&nbsp;</span>
	<select on:change={() => updateFilter()} id="filter-incoming">
		<option selected value="all">To or From</option>
		<option value="to">To Me</option>
		<option value="from">From Me</option>
	</select>
	<br />
	<span>Price:&nbsp;</span>
	<input
		id="filter-min"
		type="number"
		pattern="\d"
		on:input={() => updateFilter()}
		placeholder="Min Amount"
	/>
	<span>&nbsp;-&nbsp;</span>
	<input
		id="filter-max"
		type="number"
		pattern="\d"
		on:input={() => updateFilter()}
		placeholder="Max Amount"
	/>
	<br />
	<span>Date:&nbsp;</span>
	<input id="filter-before" type="date" on:change={() => updateFilter()} />
	<span>&nbsp;-&nbsp;</span>
	<input id="filter-after" type="date" on:change={() => updateFilter()} />
	<br />
	<span>Search:&nbsp;</span>
	<input
		id="filter-text"
		type="text"
		on:input={() => updateFilter()}
		placeholder="Search"
	/>
</div>

<div class="p-4 bg-white rounded shadow-md flex">
	{#if filteredItems.length != 0}
		<table class="w-full table-auto transactions">
			<thead>
				<tr class="text-left">
					<th class="px-2" />
					<th>Date</th>
					<th>From</th>
					<th>To</th>
					<th>Amount</th>
					<th>Reason</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredItems as item}
					<tr class="border-t-2 border-gray-300">
						<td class="px-2 text-center">
							{#if item.to.me}
								<img
									src="assets/recieve.svg"
									alt="&rarr;"
									class="w-8 h-8 m-auto"
								/>
							{:else if item.from.me}
								<img
									src="assets/send.svg"
									alt="&larr;"
									class="w-8 h-8 m-auto"
								/>
							{/if}
						</td>
						<td>
							{new Date(item.date).toLocaleString()}
						</td>
						<td>
							{#if item.from.me}Me{:else}{item.from.text ||
									'Unknown'}{/if}
						</td>
						<td>
							{#if item.to.me}Me{:else}{item.to.text ||
									'Unknown'}{/if}
						</td>
						<td
							>{item.amount < 0 ? '-' : ''}<span
								class="icon icon-logo mr-1"
							/>{Math.abs(item.amount).toLocaleString()}</td
						>
						<td>{item.reason || 'None'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<h1>
			{#if items.length == 0}No transactions.{:else}No transactions match
				this filter.{/if}
		</h1>
	{/if}
</div>
