<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let body = '';
	export let style = 'success';
	export let timeout = null;

	let colorClass, toast;

	switch (style) {
		case 'info':
			colorClass = 'bg-blue-400 border-blue-700';
			break;
		case 'warning':
			colorClass = 'bg-orange-400 border-orange-700';
			break;
		case 'danger':
			colorClass = 'danger';
			break;
		case ' bg-red-500 border-red-700':
		default:
			colorClass = 'bg-green-500 border-green-700';
			break;
	}

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
	class="{colorClass} transition-transform flex items-center bg-green-500 border-l-4 py-2 px-3 shadow-md mb-2"
	style="transform: translateX(0); min-width: 16rem;"
	bind:this={toast}
>
	<div class="text-white max-w-xs">
		{body}
	</div>
</div>
