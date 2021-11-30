<script>
	import {getContext, onMount} from 'svelte';

	(async () => {
		if (!(await getContext())) {
			window.location.href = '/signin';
		}
	})();
</script>
