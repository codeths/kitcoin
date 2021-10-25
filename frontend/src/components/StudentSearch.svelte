<script>
	import {createEventDispatcher, onMount} from 'svelte';
	import {searchUsers} from '../utils/api';
	const dispatch = createEventDispatcher();

	let results = [];
	let input,
		parent,
		resultEls = [],
		focusindex = -1;

	export let inputClass = '';

	export let value = '';

	$: {
		if (value == null && input) input.value = '';
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

	function setValue(e, user) {
		e.preventDefault();
		value = user.id;
		input.value = user.name;
		input.blur();
		results = [];
		dispatch('change', value);
		dispatch('blur', value);
	}

	function blur(e) {
		let target = e.relatedTarget;
		if (!target || !parent.contains(target)) {
			results = [];
			dispatch('blur', value);
		}
	}

	async function search(text, resetValue = false) {
		if (resetValue && value) {
			value = '';
			dispatch('change', value);
		}
		if (text.replace(/[ \n]/g, '') == '') {
			results = [];
		} else {
			try {
				results = await searchUsers(text, 15, ['STUDENT']);
			} catch (e) {
				results = [];
			}
		}
	}
</script>

<div class="group w-auto" bind:this={parent} on:keydown={key}>
	<input
		bind:this={input}
		class="w-full rounded border {inputClass} focus:border-gray-200 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
		type="text"
		placeholder="Search for a student"
		on:input={e => {
			search(e.target.value, true);
		}}
		on:focus={e => {
			focusindex = -1;
			search(e.target.value);
		}}
		on:blur={blur}
	/>
	<div class="relative ">
		<div
			class="divide-y my-2 max-h-60 w-full overflow-scroll absolute bg-white rounded border-2 {results.length ==
			0
				? 'invisible'
				: ''}"
			tabindex="-1"
		>
			{#each results as result, index}
				<button
					class="p-2 w-full text-left focus:outline-none focus:bg-gray-100 hover:bg-gray-100"
					on:click={e => setValue(e, result)}
					tabindex="0"
					bind:this={resultEls[index]}
					>{result.name}
				</button>
			{/each}
		</div>
	</div>
</div>
