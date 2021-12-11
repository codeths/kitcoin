<script>
	import {metatags} from '@roxi/routify';
	import Button from '../components/Button.svelte';
	import SetBodyStyle from '../utils/SetBodyStyle.svelte';

	metatags.title = '404 - Kitcoin';
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200 flex flex-col" />

<!-- Content -->
<div class="m-8 flex flex-col flex-1 justify-center items-center">
	<h1 class="text-8xl text-center">404</h1>
	<h2 class="text-4xl text-center my-6">Page not found</h2>
	<Button href="/home" target="_self">Home</Button>
</div>
