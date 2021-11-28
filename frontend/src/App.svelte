<script>
	import {Router, isChangingPage} from '@roxi/routify';
	import {routes} from '../.routify/routes';
	import SetBodyStyle from './utils/SetBodyStyle.svelte';
	import {setContext} from 'svelte';
	import {getUserInfo} from './utils/api';

	const userInfoPromise = getUserInfo().catch(e =>
		console.error('Failed to get user info: ', e),
	);
	setContext('userInfo', userInfoPromise);
</script>

<Router {routes} />

<!--  Reset body styles on page changes  -->
{#if $isChangingPage}
	<SetBodyStyle classString="" styleString="" />
{/if}
