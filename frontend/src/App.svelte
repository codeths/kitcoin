<script>
	import {Router, beforeUrlChange} from '@roxi/routify';
	import {routes} from '../.routify/routes';
	import {setContext} from 'svelte';
	import {getUserInfo} from './utils/api';
	import {userInfo} from './utils/store';

	const routeConfig = {
		'/staff': 'STAFF',
		'/student': 'STUDENT',
	};

	let info = undefined;
	const userInfoPromise = getUserInfo().catch(e => {
		info = null;
	});
	setContext('userInfo', userInfoPromise);
	userInfoPromise
		.then(i => {
			info = i || null;
			userInfo.set(info);
			handleAuthCheck();
		})
		.catch(e => {
			info = null;
			handleAuthCheck();
		});

	$beforeUrlChange((e, r) => {
		let path = r.path.replace(/\/(?:index)?$/, '');
		return handleAuthCheck(path);
	});

	function handleAuthCheck(path = window.location.pathname) {
		let requirement = routeConfig[path];
		if (
			requirement &&
			(!info ||
				(typeof requirement == 'string' &&
					!info.roles.includes(requirement)))
		) {
			window.location.href = `/login?redirect=${encodeURIComponent(
				path,
			)}&hint=true`;
			return false;
		}
		return true;
	}

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

	window.addEventListener(
		'dragover',
		e =>
			!(e.target && e.target.classList.contains('filedrop')) &&
			e.preventDefault(),
	);
	window.addEventListener(
		'drop',
		e =>
			!(e.target && e.target.classList.contains('filedrop')) &&
			e.preventDefault(),
	);
</script>

<Router {routes} />

<svelte:head>
	<link rel="icon" href="/assets/favicon/{favicon}.ico" />
	<link
		rel="icon"
		type="image/png"
		href="/assets/favicon/{favicon}-32.png"
		sizes="32x32"
	/>
	<link
		rel="icon"
		type="image/png"
		href="/assets/favicon/{favicon}-196.png"
		sizes="196x196"
	/>
	<link rel="icon" href="/assets/favicon/favicon.svg" type="image/svg+xml" />
	<meta name="theme-color" content="#1a2741" />
</svelte:head>
