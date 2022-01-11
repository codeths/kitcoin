<script>
	import Toast from './Toast.svelte';
	let toasts = new Map();
	let id = 0;

	let toastArray = [];

	$: toastArray = Array.from(toasts).map(x => ({id: x[0], ...x[1]}));

	export function toast(body, style, duration = 5000) {
		toasts.set(id, {style, body});
		let thisId = id;
		toasts = toasts;
		setTimeout(() => {
			els[thisId].close();
		}, duration);
		id++;
	}

	let els = [];
</script>

<div class="flex flex-col justify-center fixed right-0 top-0 m-4 z-[9999]">
	{#each toastArray as {style, body, id}}
		<Toast
			{style}
			{body}
			bind:this={els[id]}
			on:close={e => {
				toasts.set(id, {...toasts.get(id), closed: true});
				if (Array.from(toasts.values()).every(x => x.closed)) {
					toasts.clear();
					toastArray = [];
				}
			}}
		/>
	{/each}
</div>
