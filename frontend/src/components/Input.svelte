<svelte:options accessors={true} />

<script>
	import {createEventDispatcher, onMount} from 'svelte';

	const dispatch = createEventDispatcher();

	export let value = '';
	export let label = '';
	export let error = '';
	export let type = 'input';
	export let input = null;
	export let disabled = false;
	export let focus = false;
	let additionalClasses = '';
	export {additionalClasses as class};

	function handle(e) {
		dispatch('validate', {
			type: e.type,
			target: e.target,
			value: input.type == 'checkbox' ? e.target.checked : e.target.value,
		});
	}

	onMount(() => {
		if (input && type == 'input') {
			input.type = type;
		}
		if (focus) setTimeout(() => input.focus(), 0);
		handle({
			target: input,
			value: '',
		});
	});
</script>

<div>
	<label class="label" for="">
		<span class="label-text"> {label} </span>
	</label>
	{#if type == 'textarea'}
		<textarea
			class="textarea textarea-bordered w-full {additionalClasses}"
			class:textarea-success={error === null}
			class:textarea-error={error}
			{disabled}
			placeholder={label}
			on:input={handle}
			on:focus={handle}
			on:blur={handle}
			on:change
			on:input
			on:keydown
			on:focus
			on:blur
			bind:value
			bind:this={input}
			{...$$restProps}
		/>
	{:else if type == 'checkbox' || type == 'switch'}
		<input
			class:checkbox={type == 'checkbox'}
			class:toggle={type == 'switch'}
			class={additionalClasses}
			type="checkbox"
			{disabled}
			on:change={handle}
			on:change
			bind:checked={value}
			bind:this={input}
			{...$$restProps}
		/>
	{:else}
		<input
			class="input input-bordered	w-full {additionalClasses}"
			class:input-success={error === null}
			class:input-error={error}
			{disabled}
			placeholder={label}
			on:input={handle}
			on:focus={handle}
			on:blur={handle}
			on:change
			on:input
			on:keydown
			on:focus
			on:blur
			bind:value
			bind:this={input}
			{...$$restProps}
		/>
	{/if}
	<slot name="after-input" />
	{#if error}
		<label class="label" for="">
			<span class="label-text-alt text-error"> {error} </span>
		</label>{/if}
</div>
