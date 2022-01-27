<svelte:options accessors={true} />

<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {Input, Loading} from '.';

	let input,
		parent,
		resultEls = [],
		focusindex = -1;
	let inputFocused = false;

	let ignoreQuery = false;

	export let multiselect = false;
	export let value = multiselect ? [] : '';
	export let error = '';
	export let query = '';
	export let results = null;

	$: {
		if (
			multiselect &&
			inputFocused &&
			(!results || results.length == 0) &&
			!query.trim() &&
			value.length > 0
		)
			results = value.sort((a, b) => a.text.localeCompare(b.text));
	}

	function multiSelectText() {
		if (value.length > 0) {
			query = `${value.length} item${
				value.length == 1 ? '' : 's'
			} selected`;
			ignoreQuery = true;
		} else {
			ignoreQuery = false;
		}
	}

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
			(!e.relatedTarget ||
				(!parent.contains(e.relatedTarget) &&
					!resultEls.includes(e.relatedTarget))) &&
			(!e.target || !resultEls.includes(e.target))
		) {
			if (multiselect) {
				multiSelectText();
			}
			results = null;
			validate('blur', value, query);
		}
	}

	function setValue(e, data) {
		e.preventDefault();
		if (multiselect) {
			if (value.includes(data)) {
				value = value.filter(v => v.value !== data.value);
			} else {
				value = [...value, data];
			}
			query = '';
			ignoreQuery = true;
		} else {
			value = data.value;
			query = data.text;
			document.body.focus();
		}
		validate(
			'blur',
			value,
			!multiselect || value.some(x => x.value == data.value)
				? data.text
				: '',
		);
		dispatch('change', {target: input.input, value});
		results = null;
		if (multiselect) input.input.focus();
	}

	function validate(type, value, query) {
		dispatch('validate', {type, value, target: input.input, query});
	}

	let loading = false;
	async function getResults(text, resetValue = false, resetTo = '') {
		if (!text) text = '';
		text = text.trim();
		if (resetValue && !multiselect && value) {
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
		on:keydown
		on:input={e => {
			getResults(e.target.value, true, e.data);
		}}
		on:focus={e => {
			focusindex = -1;
			if (ignoreQuery) {
				ignoreQuery = false;
				query = '';
			}
			inputFocused = true;
			if (query.trim()) getResults(query);
		}}
		on:validate={e => {
			if (e.detail.type !== 'blur') {
				validate(e.detail.type, value, e.detail.value);
			}
		}}
		on:blur={() => (inputFocused = false)}
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
							{#if multiselect}
								<button
									class="px-4 py-2 w-full text-left focus:outline-none focus:bg-base-200 hover:bg-base-200"
									on:blur={blur}
									on:click={e => {
										setValue(e, result);
									}}
									tabindex="0"
									bind:this={resultEls[index]}
								>
									<input
										type="checkbox"
										class="checkbox"
										checked={value &&
											value.some(
												x => x.value == result.value,
											)}
									/>
									<span>
										{#if result.html}
											{@html result.html}
										{:else}
											{result.text}
										{/if}
									</span></button
								>
							{:else}
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
							{/if}
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
