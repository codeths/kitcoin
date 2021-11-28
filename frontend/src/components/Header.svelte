<script>
	import {getContext, onMount} from 'svelte';

	export let active = 0; // Index of active link, defaulting to home
	const links = [
		// shown from left to right
		{
			text: 'Home',
			to: '/',
		},
		{
			text: 'Store',
			to: '/store',
		},
	];
	const userInfo = getContext('userInfo');

	onMount(async () => {
		//This won't work if we aren't logged in
		const role = (await userInfo).role;
		if (role == 'STAFF') links[0].to = '/staff';
		if (role == 'STUDENT') links[0].to = '/student';
	});
</script>

<header>
	<nav
		class="w-full bg-blue-eths text-white p-3 flex justify-between items-center shadow-xl"
	>
		<div>
			<a href="/">
				<h2
					class="text-white font-light text-5xl ml-2 md:ml-4 flex justify-center items-center"
				>
					<span class="icon icon-logo mr-1" />Kitcoin
				</h2></a
			>
		</div>
		<div class="flex md:hidden">
			<!-- TODO: Menu bar collapse -->
		</div>
		<div class="hidden md:flex space-x-8 md:space-x-12 mr-5 md:mr-10">
			{#each links as link, index}
				<a
					class="text-white font-medium text-3xl"
					class:border-b-4={index == active}
					href={link.to}>{link.text}</a
				>
			{/each}
		</div>
	</nav>
</header>
