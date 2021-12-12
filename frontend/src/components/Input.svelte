<script>
	import {createEventDispatcher, onMount} from 'svelte';

	const dispatch = createEventDispatcher();

	export let value = '';
	export let label = '';
	export let valid = false;
	export let error = '';
	export let type = 'input';
	export let input = null;
	export let disabled = false;
	export let focus = false;

	function handle(e) {
		dispatch('validate', {
			type: e.type,
			value: e.target.value,
			element: input,
		});
	}

	onMount(() => {
		if (input && type !== 'textarea') {
			input.type = type;
		}
		if (focus) input.focus();
	});
</script>

<div class="my-2">
	<label class="label" for="">
		<span class="label-text"> {label} </span>
	</label>
	{#if type == 'textarea'}
		<textarea
			class="textarea textarea-bordered w-full"
			class:textarea-success={valid}
			class:textarea-error={error}
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
			class="input input-bordered	w-full"
			class:input-success={valid}
			class:input-error={error}
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
	<slot name="after-input" />
	{#if error}
		<label class="label" for="">
			<span class="label-text-alt text-error"> {error} </span>
		</label>{/if}
</div>
