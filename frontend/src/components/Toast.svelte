<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let body = '';
	export let style = 'success';
	export let timeout = null;

	let toast;

	if (timeout) {
		setTimeout(() => {
			toast.style.transform = 'translateX(calc(100% + 1rem))';
			setTimeout(() => {
				dispatch('close');
			}, 300);
		}, timeout - Date.now());
	}
</script>

<div
	class="alert alert-{style} bg-{style} transition-transform min-w-[16rem]"
	bind:this={toast}
	style="transform: translateX(0);"
>
	<div class="flex-1">
		<span class="icon-{style}" />
		{body}
	</div>
</div>
