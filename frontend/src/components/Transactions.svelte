<script>
	/*
	  Transaction object
	*/
	import {getBalance, getTransactions} from '../utils/api.js';
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {Loading, ToastContainer, Input, StudentSearch} from '.';
	let toastContainer;

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

	let filterCollapseShown = false;
	let search = '';
	let userSearch = null;
	let hasFilter = false;

	let totalDocCount = null;
	let filteredDocCount = null;

	export async function load(p = page, which) {
		if (which) loading[which] = true;
		await getTransactions(user, p, search, userSearch?.value)
			.then(res => {
				error = null;
				(transactions = res), (page = p);
			})
			.catch(e => {
				error = e;
				page = p;
			});

		if (which) loading[which] = false;
		hasFilter = (search || userSearch) && true;

		filteredDocCount = transactions.docCount;
		if (!hasFilter) totalDocCount = transactions.docCount;
	}

	async function deleteTransaction(id) {
		let res = await fetch(`/api/transactions/${id}`, {
			method: 'DELETE',
		}).catch(e => {});
		if (res && res.ok) {
			toastContainer.toast('Transaction deleted!', 'success');
			getBalance().then(bal => dispatch('balance', bal));
		} else {
			toastContainer.toast('Error deleting transaction', 'error');
		}
		load();
	}

	function negativeTransaction(transaction) {
		return transaction.from.me
			? transaction.amount > 0
			: transaction.amount < 0;
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

<div class="collapse bg-base-200 rounded-lg collapse-arrow mb-4">
	<input
		type="checkbox"
		id="filtercollapse"
		bind:checked={filterCollapseShown}
	/>
	<label
		for="filtercollapse"
		class="collapse-title text-xl font-medium !bg-base-200"
	>
		{filterCollapseShown ? 'Hide' : 'Show'} filters
	</label>
	<div class="flex space-x-4 collapse-content !bg-base-200">
		<div>
			<Input
				class="w-auto"
				label="Search description"
				bind:value={search}
				on:change={() => load()}
			/>
		</div>
		<div>
			<StudentSearch
				class="w-auto relative"
				label="Search user"
				bind:value={userSearch}
				on:change={() => load()}
			/>
		</div>
	</div>
</div>
{#if totalDocCount !== null}
	<p class="text-center text-xl my-2">
		{#if hasFilter}
			Showing {filteredDocCount} of {totalDocCount} transaction{totalDocCount ===
			1
				? ''
				: 's'}
		{:else}
			Found {totalDocCount} transaction{totalDocCount === 1 ? '' : 's'}
		{/if}
	</p>
{/if}
<div class="w-full flex flex-col divide-y divide-gray-300">
	{#if transactions.pageCount !== 0}
		<table class="w-full table-auto">
			<thead class="hidden md:table-header-group w-full">
				<tr class="text-left border-b border-gray-300">
					<th class="px-2 pb-2">Date</th>
					<th class="px-2 pb-2">Description</th>
					<th class="px-2 pb-2">Amount</th>
					<th class="px-2 pb-2" />
				</tr>
			</thead>
			<tbody class="w-full divide-y divide-gray-300">
				{#each transactions.transactions as item}
					<tr>
						<div
							class="flex flex-row align-middle justify-between md:contents"
						>
							<div class="flex-col align-middle md:contents">
								<td
									class="px-2 pt-4 md:py-4 block mr-8 md:table-cell md:mr-0 overflow-ellipsis"
								>
									{new Date(item.date).toLocaleDateString()}
									{new Date(item.date).toLocaleTimeString(
										[],
										{
											hour: 'numeric',
											minute: '2-digit',
										},
									)}
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
										  }`}{item.reason
										? `: ${item.reason}`
										: ''}
								</td>
							</div>
							{#if item.canManage}
								<div class="flex-col self-center md:hidden">
									<button
										class="btn btn-ghost md:w-full"
										on:click={confirm(
											'Are you sure you want to delete this transaction?',
										) && deleteTransaction(item._id)}
									>
										<span class="icon-delete text-2xl" />
									</button>
								</div>{/if}
						</div>
						<td
							class="px-2 pb-4 md:py-4 block md:table-cell text-right text-3xl md:text-left md:text-base {negativeTransaction(
								item,
							)
								? 'text-error'
								: 'text-base-content'}"
							><span>
								{#if negativeTransaction(item)}<span
										>&minus;&nbsp;</span
									>{:else}<span>&ensp;&nbsp;</span>{/if}<span
									class="icon-currency mx-1"
								/>{Math.abs(item.amount).toLocaleString([], {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}</span
							></td
						>
						<td class="px-2 py-4 hidden md:table-cell">
							{#if item.canManage}
								<button
									class="btn btn-ghost md:w-full md:justify-self-end p-0"
									on:click={confirm(
										'Are you sure you want to delete this transaction?',
									) && deleteTransaction(item._id)}
								>
									<span class="icon-delete text-xl" />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="text-center text-xl">
			{hasFilter
				? 'No transactions match your search'
				: 'No transactions'}
		</p>
	{/if}

	{#if error}
		<div class="pt-4">
			<div class="text-center mb-2">
				{error}
			</div>
			<div class="flex justify-center align-center">
				<button
					class="btn btn-primary w-36"
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
	{:else if loading.any || transactions.pageCount !== 0}
		<div class="pt-4">
			<div class="text-center mb-2">
				{#if loading.any}
					Loading...
				{:else}
					Showing page {transactions.page} of {transactions.pageCount}
				{/if}
			</div>
			<div class="flex justify-center align-center">
				<button
					class="btn btn-primary w-36 mx-2"
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
					class="btn btn-primary w-36 mx-2"
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

<ToastContainer bind:this={toastContainer} />
