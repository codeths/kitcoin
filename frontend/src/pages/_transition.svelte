<script>
	import {fade} from 'svelte/transition';
</script>

<div transition:fade class="absolute w-screen min-h-screen-nonav bg-base-300">
	<slot />
</div>
