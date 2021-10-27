<script>
	import {createEventDispatcher, onMount} from 'svelte';

	const dispatch = createEventDispatcher();

	let borderStyle = '',
		textStyle = '';

	export let value = '';
	export let label = '';
	export let valid = false;
	export let error = '';
	export let type = 'input';
	export let input = null;
	export let disabled = false;
	export let focus = false;

	let className =
		'border shadow rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-200 disabled:cursor-not-allowed';
	$: {
		if (error) {
			borderStyle = 'border-red-500';
			textStyle = 'text-red-500';
		} else if (valid) {
			borderStyle = 'border-green-500';
			textStyle = '';
		} else {
			borderStyle = '';
			textStyle = '';
		}
	}

	function handle(e) {
		dispatch('validate', {
			type: e.type,
			value: e.target.value,
			element: input,
		});
	}

	let tag = `<${type}
		class=""
		placeholder="${label}"
		on:input="${handle}" on:focus="${handle}" on:blur="${handle}" bind:value="${value}"
	></${type}>`;

	onMount(() => {
		if (input && type !== 'textarea') {
			input.type = type;
		}
		if (focus) input.focus();
	});
</script>

<div class="my-2">
	<label class="{textStyle} block text-sm font-bold mb-2" for="reason">
		{error || label}
	</label>
	{#if type == 'textarea'}
		<textarea
			class="{className} {borderStyle}"
			{disabled}
			placeholder={label}
			on:input={handle}
			on:focus={handle}
			on:blur={handle}
			on:input
			on:focus
			on:blur
			bind:value
			bind:this={input}
		/>
	{:else}
		<input
			class="{className} {borderStyle}"
			{disabled}
			placeholder={label}
			on:input={handle}
			on:focus={handle}
			on:blur={handle}
			on:input
			on:focus
			on:blur
			bind:value
			bind:this={input}
		/>
	{/if}
</div>
