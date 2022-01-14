<script>
	import {fade} from 'svelte/transition';
</script>

<div transition:fade class="w-screen min-h-full row-start-1 col-start-1">
	<slot />
</div>
