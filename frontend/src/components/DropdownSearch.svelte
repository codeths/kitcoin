<svelte:options accessors={true} />

<script>
	import {createEventDispatcher} from 'svelte';
	import Input from './Input.svelte';
	import Loading from './Loading.svelte';
	const dispatch = createEventDispatcher();

	let input,
		parent,
		resultEls = [],
		focusindex = -1;

	export let value = '';
	export let error = '';
	export let query = '';
	export let results = null;

	function key(e) {
		// On arrow down
		if (e.keyCode === 40) {
			e.preventDefault();
			moveFocus(1);
		}
		// On arrow up
		if (e.keyCode === 38) {
			e.preventDefault();
			moveFocus(-1);
		}
	}

	function moveFocus(dir) {
		let newIndex = focusindex + dir;
		if (newIndex < -1) return;
		if (newIndex >= resultEls.length) return;

		focusindex += dir;

		if (newIndex === -1) {
			input.focus();
		} else {
			resultEls[newIndex].focus();
		}
	}

	function blur(e) {
		if (
			!e.relatedTarget ||
			(!parent.contains(e.relatedTarget) &&
				!resultEls.includes(e.relatedTarget))
		) {
			results = null;
			validate('blur', value, query);
		}
	}

	function setValue(e, data) {
		e.preventDefault();
		validate('blur', data.value, data.text);
		dispatch('change', {target: input.input, value: data.value});
		value = data.value;
		query = data.text;
		results = null;
		document.body.focus();
	}

	function validate(type, value, query) {
		dispatch('validate', {type, value, target: input.input, query});
	}

	let loading = false;
	async function getResults(text, resetValue = false, resetTo = '') {
		if (!text) text = '';
		text = text.trim();
		if (resetValue && value) {
			if (!resetTo) resetTo = '';
			value = '';
			query = resetTo;
			text = resetTo;
			dispatch('change', value);
		}
		try {
			loading = true;
			dispatch('search', text);
		} catch (e) {
			results = [];
		}
		loading = false;
	}
</script>

<div class="group w-auto" bind:this={parent} on:keydown={key}>
	<Input
		bind:this={input}
		bind:value={query}
		bind:error
		on:input={e => {
			getResults(e.target.value, true, e.data);
		}}
		on:focus={e => {
			focusindex = -1;
			getResults(e.target.value);
		}}
		on:validate={e => {
			if (e.detail.type !== 'blur') {
				validate(e.detail.type, value, e.detail.value);
			}
		}}
		on:blur={blur}
		{...$$restProps}
	>
		<div class="relative" slot="after-input">
			<div class="absolute w-full mt-2">
				<div
					class="divide-y max-h-60 w-full overflow-scroll absolute border border-base-300 bg-base-100 rounded-lg {results ||
					loading
						? ''
						: 'invisible'}"
					tabindex="-1"
				>
					{#if results && results[0]}
						{#each results as result, index}
							<button
								class="px-4 py-2 w-full text-left focus:outline-none focus:bg-base-200 hover:bg-base-200"
								on:click={e => setValue(e, result)}
								on:blur={blur}
								tabindex="0"
								bind:this={resultEls[index]}
								><span>
									{#if result.html}
										{@html result.html}
									{:else}
										{result.text}
									{/if}
								</span></button
							>
						{/each}
					{:else if loading}
						<div class="py-2">
							<Loading height="3rem" />
						</div>
					{:else}
						<span class="px-4 py-2 w-full text-left block"
							>No Results</span
						>
					{/if}
				</div>
			</div>
		</div>
	</Input>
</div>
