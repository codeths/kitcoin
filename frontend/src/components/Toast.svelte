<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let body = '';
	export let style = 'success';
	export let timeout = null;

	let toast;

	if (timeout) {
		setTimeout(() => {
			if (toast) toast.style.transform = 'translateX(calc(100% + 1rem))';
			setTimeout(() => {
				dispatch('close');
			}, 300);
		}, timeout - Date.now());
	}
</script>

<div
	class="alert text-white bg-{style}/80 transition-transform min-w-[16rem] px-4 py-2 my-2"
	bind:this={toast}
	style="transform: translateX(0);"
>
	<div class="flex-1">
		<span class="icon-{style} text-xl mr-1 align-middle" />
		<span>{body}</span>
	</div>
</div>
