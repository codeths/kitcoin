<script>
	import {fade} from 'svelte/transition';
</script>

<div transition:fade class="absolute w-screen">
	<slot />
</div>
