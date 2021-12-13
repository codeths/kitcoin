<script>
	import Toast from './Toast.svelte';
	let toasts = new Map();
	let id = 0;

	// let toastArray = [];

	$: toastArray = [...toasts]
		.map(x => ({id: x[0], ...x[1]}))
		.filter(x => x.timeout > Date.now());

	export function toast(body, style, duration = 5000) {
		toasts.set(id, {style, body, timeout: Date.now() + duration});
		toasts = toasts;
		id++;
	}

	function removeToast(id) {
		toasts.delete(id);
		toasts = toasts;
	}
</script>

<div class="flex flex-col justify-center fixed right-0 top-0 m-4">
	{#each toastArray as { style, body, timeout, id }}
		<Toast {style} {body} {timeout} on:close={() => removeToast(id)} />
	{/each}
</div>
