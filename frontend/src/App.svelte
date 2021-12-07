<script>
	import {Router, isChangingPage, metatags} from '@roxi/routify';
	import {routes} from '../.routify/routes';
	import SetBodyStyle from './utils/SetBodyStyle.svelte';
	import {setContext} from 'svelte';
	import {getUserInfo} from './utils/api';

	metatags.title = 'Kitcoin';

	const userInfoPromise = getUserInfo().catch(e =>
		console.error('Failed to get user info: ', e),
	);
	setContext('userInfo', userInfoPromise);

	let favicon = 'favicon';

	function handleMediaQuery() {
		favicon = window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'favicon-dark'
			: 'favicon';
	}

	if (window.matchMedia) {
		handleMediaQuery();
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', handleMediaQuery);
	}
</script>

<Router {routes} />

<svelte:head>
	<link rel="icon" href="/{favicon}.ico" />
</svelte:head>

<!--  Reset body styles on page changes  -->
{#if $isChangingPage}
	<SetBodyStyle classString="" styleString="" />
{/if}
