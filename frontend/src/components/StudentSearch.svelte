<svelte:options accessors={true} />

<script>
	import {searchUsers} from '../utils/api';
	import DropdownSearch from './DropdownSearch.svelte';

	export let value = '';
	export let error = '';
	export let query = '';
	export let me = null;

	let results = null;

	async function getStudents(text) {
		if (!text) {
			results = null;
		} else {
			results = (
				await searchUsers(text, 15, ['STUDENT'], me).catch(e => [])
			).map(x => ({text: x.name, value: x.id}));
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
	on:search={e => getStudents(e.detail)}
	{...$$restProps}
/>
