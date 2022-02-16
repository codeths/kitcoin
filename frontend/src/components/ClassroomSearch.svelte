<svelte:options accessors={true} />

<script>
	import {getClasses} from '../utils/api';
	import {DropdownSearch} from '.';

	export let value = [];
	export let extraClasses = [];
	export let error = '';
	export let query = '';
	export let role = 'any';
	export let multiselect = false;
	export let classes = null;

	let loading = true;

	let results = null;
	export let el = null;

	async function getResults(text) {
		if (!classes) {
			classes = await getClasses(role);
			loading = false;
			classes.sort((a, b) => a.name.localeCompare(b.name));
			extraClasses.forEach(classData => {
				if (!classes.some(x => x.id == classData.value))
					classes.push({name: classData.text, id: classData.value});
			});
		}

		results = classes
			.filter(x => x.name.toLowerCase().includes(text.toLowerCase()))
			.map(x => ({
				text: x.name,
				value: x.id,
			}));
	}

	getClasses(role).then(() => (loading = false)); // pre-fetch
</script>

<DropdownSearch
	label="Classes"
	bind:this={el}
	bind:results
	bind:value
	bind:query
	bind:error
	on:validate
	on:change
	on:search={e => getResults(e.detail)}
	{multiselect}
	disabled={loading}
	placeholderOverride={loading ? 'Loading...' : null}
	{...$$restProps}
/>
