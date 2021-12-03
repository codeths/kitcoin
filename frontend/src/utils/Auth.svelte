<script>
	import {getContext, onMount} from 'svelte';

	let ctx = getContext('userInfo');
	(async () => {
		let info = (await ctx) || null;
		if (!info) {
			window.location.reload();
		}
	})();
</script>
