<script>
	import Header from '../../components/Header.svelte';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	import Auth from '../../utils/Auth.svelte';
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200" />
<Auth />
<Header />

<!-- Content -->
<div class="my-28 md:my-36 lg:my-44 xl:my-56 mx-auto text-center max-w-7xl">
	<h1 class="text-6xl font-black">Welcome to the Kitcoin Store!!</h1>
	<br />
	<p class="text-3xl text-gray-700">
		Here you can buy lots of cool stuff with your hard earned Kitcoin. Check
		out our awesome selection of Beans&trade; and get your Supreme Bricks
		while they're still in stock!
	</p>
</div>
