<script>
	/*
	  Transaction object
	*/
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

<div
	class="w-full p-4 bg-white rounded shadow-md flex flex-col divide-y divide-gray-300"
>
	{#if filteredItems.length != 0}
		<table class="w-full table-auto">
			<thead class="hidden md:table-header-group w-full">
				<tr class="text-left border-b border-gray-300">
					<th class="px-2 pb-2">Date</th>
					<th class="px-2 pb-2">Description</th>
					<th class="px-2 pb-2">Amount</th>
				</tr>
			</thead>
			<tbody class="w-full divide-y divide-gray-300">
				{#each filteredItems as item}
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
								: `To ${item.to.text || 'Unknown'}`}{item.reason
								? `: ${item.reason}`
								: ''}
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
		<h1>
			{#if items.length == 0}No transactions.{:else}No transactions match
				this filter.{/if}
		</h1>
	{/if}
</div>
