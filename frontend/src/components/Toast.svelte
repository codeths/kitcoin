<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let body = '';
	export let style = 'success';
	export let timeout = null;

	let toast;

	if (timeout) {
		setTimeout(() => {
			close();
		}, timeout - Date.now());
	}

	export function close() {
		if (toast) toast.style.transform = 'translateX(calc(100% + 1rem))';
		setTimeout(() => {
			toast.style.display = 'none';
			dispatch('close');
		}, 300);
	}
</script>

<div
	class="alert text-white bg-{style}/80 transition-transform min-w-[16rem] px-4 py-2 my-2"
	bind:this={toast}
	style="transform: translateX(0);"
>
	<div class="flex-1 items-center">
		<span class="icon-{style} text-2xl mr-2 align-middle" />
		<span>{body}</span>
	</div>
</div>
