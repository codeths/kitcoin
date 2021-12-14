<script>
	import {
		Router,
		isChangingPage,
		metatags,
		beforeUrlChange,
	} from '@roxi/routify';
	import {routes} from '../.routify/routes';
	import {setContext} from 'svelte';
	import {getUserInfo} from './utils/api';
	import {userInfo} from './utils/store';

	metatags.title = 'Kitcoin';

	let info = undefined;
	const userInfoPromise = getUserInfo().catch(e => {
		info = null;
		console.error('Failed to get user info: ', e);
	});
	setContext('userInfo', userInfoPromise);
	userInfoPromise
		.then(i => {
			info = i || null;
			userInfo.set(info);
		})
		.catch(e => {
			info = null;
		});

	$beforeUrlChange((e, r) => {
		let path = r.path.replace(/\/(?:index)?$/, '');
		let requirement = routeConfig[path];
		if (
			requirement &&
			(info === null ||
				(typeof requirement == 'string' &&
					!info.roles.includes(requirement)))
		) {
			window.location.href = `/login?redirect=${encodeURIComponent(
				path,
			)}&hint=true`;
			return false;
		}
		return true;
	});

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

	const routeConfig = {
		'/staff': 'STAFF',
		'/student': 'STUDENT',
	};

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
	<link rel="icon" href="/{favicon}.ico" />
</svelte:head>
