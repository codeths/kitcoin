<script>
	import {Router} from '@roxi/routify';
	import {routes} from '../.routify/routes';
	import {setContext} from 'svelte';
	import {getUserInfo} from './utils/api';

	const userInfoPromise = getUserInfo().catch(e =>
		console.error('Failed to get user info: ', e),
	);
	setContext('userInfo', userInfoPromise);
</script>

<Router {routes} />
