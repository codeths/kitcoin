<script>
	import {createEventDispatcher} from 'svelte';
	import {searchUsers} from '../utils/api';
	import Input from './Input.svelte';
	const dispatch = createEventDispatcher();

	let results = null;
	let input,
		parent,
		resultEls = [],
		focusindex = -1;

	export let value = '';
	export let valid = false;
	export let error = '';
	export let query = '';
	export let disabled = false;

	$: {
		if (!value) query = '';
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
		if (!e.relatedTarget || !parent.contains(e.relatedTarget)) {
			results = null;
			validate('blur', value, e.target, query);
		}
	}

	function setValue(e, user) {
		e.preventDefault();
		validate('blur', user.id, input.input, user.name);
		value = user.id;
		query = user.name;
		results = null;
		document.body.focus();
	}

	function validate(type, value, element, query) {
		dispatch('validate', {type, value, element, query});
	}

	let loading = false;
	async function search(text, resetValue = false) {
		if (resetValue && value) {
			value = '';
			dispatch('change', value);
		}
		if (text.replace(/[ \n]/g, '') == '') {
			results = null;
		} else {
			try {
				loading = true;
				results = await searchUsers(text, 15, ['STUDENT']);
			} catch (e) {
				results = [];
			}
			loading = false;
		}
	}
</script>

<div class="group w-auto" bind:this={parent} on:keydown={key}>
	<Input
		label="Student"
		{disabled}
		bind:this={input}
		bind:value={query}
		bind:error
		bind:valid
		on:input={e => {
			search(e.target.value, true);
		}}
		on:focus={e => {
			focusindex = -1;
			search(e.target.value);
		}}
		on:validate={e => {
			if (!e.detail.type == 'blur') {
				validate(
					e.detail.type,
					value,
					e.detail.element,
					e.detail.value,
				);
			}
		}}
		on:blur={blur}
	/>
	<div class="relative">
		<div
			class="divide-y max-h-60 w-full overflow-scroll absolute bg-white rounded border-2 {results ||
			loading
				? ''
				: 'invisible'}"
			tabindex="-1"
		>
			{#if results && results[0]}
				{#each results as result, index}
					<button
						class="p-2 w-full text-left focus:outline-none focus:bg-gray-100 hover:bg-gray-100"
						on:click={e => setValue(e, result)}
						on:blur={blur}
						tabindex="0"
						bind:this={resultEls[index]}
						>{result.name}
					</button>
				{/each}
			{:else}
				<span class="p-2 w-full text-left block"
					>{loading ? 'Loading...' : 'No Results'}</span
				>
			{/if}
		</div>
	</div>
</div>
