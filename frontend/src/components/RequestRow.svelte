<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let staff = false;
	export let request;
	export let toastContainer;

	async function approveRequest(id) {
		if (!confirm('Did the student recieve their item?')) return;

		let res = await fetch(`/api/store/request/${id}`, {
			method: 'POST',
		}).catch(() => null);

		if (res.ok) {
			toastContainer.toast('Request approved.', 'success');
		} else {
			toastContainer.toast('Error approving request.', 'error');
		}

		dispatch('reload');
	}

	async function cancelRequest(id) {
		if (
			!confirm(
				`Are you sure you want to ${
					staff ? 'deny' : 'cancel'
				} this request?`,
			)
		)
			return;

		let res = await fetch(`/api/store/request/${id}`, {
			method: 'DELETE',
		}).catch(() => null);

		if (res.ok) {
			toastContainer.toast('Request cancelled.', 'success');
		} else {
			toastContainer.toast('Error cancelling request.', 'error');
		}

		dispatch('reload');
	}
</script>

<tr>
	{#if !staff}
		<td class="p-4">
			{#if request.status == 'PENDING'}
				<div class="badge badge-warning">Pending</div>
			{/if}
			{#if request.status == 'APPROVED'}
				<div class="badge badge-success">Approved</div>
			{/if}
			{#if request.status == 'DENIED'}
				<div class="badge badge-error">Denied</div>
			{/if}
			{#if request.status == 'CANCELLED'}
				<div class="badge badge-error">Cancelled</div>
			{/if}
		</td>
	{/if}
	<td class="p-4">
		{new Date(request.date).toLocaleDateString()}
		{new Date(request.date).toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit',
		})}</td
	>
	{#if staff}
		<td class="p-4">{request.student.name}</td>
	{:else}
		<td class="p-4">{request.store.name}</td>
	{/if}
	<td class="p-4">{request.item.name}</td>
	<td class="p-4">{request.quantity}</td>
	<td class="p-4"
		><span class="icon-currency mx-1" />{request.price.toLocaleString([], {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}</td
	>
	<td class="p-4">
		{#if request.status == 'PENDING'}
			{#if staff}
				<button
					class="btn-circle btn-ghost text-2xl"
					on:click={() => approveRequest(request._id)}
				>
					<span class="icon-check" />
				</button>
				<button
					class="btn-circle btn-ghost text-2xl"
					on:click={() => cancelRequest(request._id)}
				>
					<span class="icon-close" />
				</button>
			{:else}
				<button
					class="btn-circle btn-ghost text-2xl"
					on:click={() => cancelRequest(request._id)}
				>
					<span class="icon-delete" />
				</button>
			{/if}
		{/if}
	</td>
</tr>
