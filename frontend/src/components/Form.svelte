<svelte:options accessors={true} />

<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();

	export let validators = {};
	export let values = {};
	export let errors = {};
	export let valid = {};

	export let isValid = false;

	let el;

	$: {
		isValid = Object.values(valid).every(v => v);
		dispatch('update');
	}

	export function validate(e) {
		let event = e.detail;
		if (!event) return;
		let which = event.target.name;
		values[which] = event.value;

		let res = validators[which](event);

		errors[which] = res;
		valid[which] = res == null;

		dispatch('update');
	}

	export function reset() {
		el.reset();
		Object.keys(values).forEach(v => {
			validate({detail: {target: {name: v}, value: ''}});
		});
		dispatch('update');
	}

	function submit(e) {
		e.preventDefault();
		if (!isValid) return;
		dispatch('submit', values);
	}
</script>

<form on:submit={submit} bind:this={el}>
	<slot />
</form>
