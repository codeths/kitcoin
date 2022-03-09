<svelte:options accessors={true} />

<script>
	import {searchUsers} from '../utils/api';
	import {DropdownSearch} from '.';

	export let value = [];
	export let error = '';
	export let query = '';
	export let me = null;
	export let students = null;
	export let multiselect = false;
	export let roles = ['STUDENT'];

	if (!multiselect) {
		if (value == []) {
			value = null;
		} else if (value) {
			query = value.text;
		}
	}

	let results = null;
	let autoSubmit = false;
	export let el = null;

	let isOpen = false;

	async function getStudents(text) {
		if (!text) {
			results = null;
		} else {
			autoSubmit = false;

			let fetchedResults = (
				await searchUsers(text, 15, roles, me).catch(e => [])
			).map(x => ({text: x.name, value: x.id, confidence: x.confidence}));

			if (!isOpen) return;

			results = fetchedResults;

			if (students)
				results = results.filter(x => students.includes(x.value));

			if (autoSubmit) {
				let confidentResult = results.find(x => x.confidence == 100);
				if (confidentResult) {
					value = confidentResult;
					query = confidentResult.text;
					results = null;
					el.error = null;
				}
			}
		}
	}
</script>

<DropdownSearch
	label="Student"
	bind:this={el}
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
	on:focus={() => (isOpen = true)}
	on:blur={() => (isOpen = false)}
	{multiselect}
	{...$$restProps}
/>
