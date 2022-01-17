<svelte:options accessors={true} />

<script>
	import {searchUsers} from '../utils/api';
	import {DropdownSearch} from '.';

	export let value = '';
	export let error = '';
	export let query = '';
	export let me = null;

	let results = null;
	let autoSubmit = false;

	async function getStudents(text) {
		if (!text) {
			results = null;
		} else {
			autoSubmit = false;

			results = (
				await searchUsers(text, 15, ['STUDENT'], me).catch(e => [])
			).map(x => ({text: x.name, value: x.id, confidence: x.confidence}));

			if (autoSubmit) {
				let confidentResult = results.find(x => x.confidence == 100);
				if (confidentResult) {
					value = confidentResult.value;
					query = confidentResult.text;
					results = null;
				}
			}
		}
	}
</script>

<DropdownSearch
	label="Student"
	bind:results
	bind:value
	bind:query
	bind:error
	on:validate
	on:change
	on:keydown={e => {
		if (e.key == 'Enter') {
			autoSubmit = true;
		}
	}}
	on:search={e => getStudents(e.detail)}
	{...$$restProps}
/>
