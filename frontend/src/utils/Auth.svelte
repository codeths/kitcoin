<script>
	import {getContext, onMount} from 'svelte';

	let ctx = getContext('userInfo');
	(async () => {
		if (!(await ctx)) {
			window.location.href = '/signin';
		}
	})();
</script>
