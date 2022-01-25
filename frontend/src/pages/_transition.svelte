<script>
	import {fade} from 'svelte/transition';
</script>

<div transition:fade class="w-full min-h-full row-start-1 col-start-1">
	<slot />
</div>
