<script>
	import {getContext, onMount} from 'svelte';

	let ctx = getContext('userInfo');
	(async () => {
		let info = (await ctx) || null;
		if (!info || !info.authorized) {
			window.location.href = '/signin?hint=true';
		}
	})();
</script>
