<svelte:options accessors={true} />

<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {Input, Loading} from '.';

	let input,
		parent,
		resultEls = [],
		focusindex = -1;

	export let multiselect = false;
	export let value = multiselect ? [] : null;
	export let error = '';
	export let query = '';
	export let label = '';
	let computedPlaceholder = label;
	export let results = null;
	let computedResults = null;

	let hide = true;

	$: {
		if (
			multiselect &&
			(!results || results.length == 0) &&
			!query.trim() &&
			value.length > 0
		) {
			computedResults = value.sort((a, b) =>
				a.text.localeCompare(b.text),
			);
			multiSelectText();
		} else computedResults = results;
	}

	function multiSelectText() {
		if (value.length == 0) {
			computedPlaceholder = label;
		} else if (value.length < 3) {
			computedPlaceholder = value.map(x => x.text).join(', ');
		} else {
			computedPlaceholder = `${value.length} item${
				value.length == 1 ? '' : 's'
			} selected`;
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
			hide = true;
			validate('blur', value, query);
		}
	}

	function setValue(e, data) {
		e.preventDefault();
		if (multiselect) {
			if (!value) value = [];
			if (value.some(v => v.value == data.value)) {
				value = value.filter(v => v.value !== data.value);
			} else {
				value = [...value, data];
			}
			multiSelectText();
			query = '';
		} else {
			value = data;
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
			value = null;
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
		class={multiselect && value && value.length > 0 && hide
			? 'placeholder:text-base-content'
			: ''}
		bind:this={input}
		bind:value={query}
		bind:error
		on:keydown
		on:focus
		on:input={e => {
			getResults(e.target.value, true, e.data);
		}}
		on:focus={e => {
			focusindex = -1;
			hide = false;
			if (query.trim()) getResults(query);
			else getResults('');
		}}
		on:validate={e => {
			if (e.detail.type !== 'blur') {
				validate(e.detail.type, value, e.detail.value);
			}
		}}
		on:blur={blur}
		{label}
		placeholder={computedPlaceholder}
		autocomplete="off"
		autocorrect="off"
		autocapitalize="off"
		spellcheck="false"
		{...$$restProps}
	>
		<div class="relative" slot="after-input">
			<div class="absolute w-full mt-2">
				<div
					class="divide-y max-h-60 w-full overflow-scroll absolute border border-base-300 bg-base-100 rounded-lg {(computedResults ||
						loading) &&
					!hide
						? ''
						: 'invisible'}"
					tabindex="-1"
				>
					{#if computedResults && computedResults[0]}
						{#each computedResults as result, index}
							{#if multiselect}
								<button
									class="px-4 py-2 w-full text-left focus:outline-none focus:bg-base-200 hover:bg-base-200 flex"
									on:blur={blur}
									on:click={e => {
										setValue(e, result);
									}}
									tabindex="0"
									bind:this={resultEls[index]}
								>
									<input
										type="checkbox"
										class="checkbox mr-2"
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
