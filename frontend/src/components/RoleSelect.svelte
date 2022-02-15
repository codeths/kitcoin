<svelte:options accessors={true} />

<script>
	import {DropdownSearch} from '.';

	export let value = [];
	export let error = '';
	export let query;
	export let multiselect = false;

	let loading = true;

	const roles = [
		{
			text: 'Student',
			value: 'STUDENT',
		},
		{
			text: 'Staff',
			value: 'STAFF',
		},
		{
			text: 'Admin',
			value: 'ADMIN',
		},
	];
	let results = [];
	export let el;

	export function setRoles(v) {
		value = roles.filter(x => v.includes(x.value));
	}

	function search(text) {
		results = roles.filter(x =>
			x.text.toLowerCase().includes(text.toLowerCase()),
		);
	}
</script>

<DropdownSearch
	label="Roles"
	bind:this={el}
	bind:results
	bind:value
	bind:query
	bind:error
	on:validate
	on:change
	on:search={e => search(e.detail)}
	{multiselect}
	{...$$restProps}
/>
