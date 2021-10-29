<script>
	export let icon = '';
</script>

<img
	src="assets/icons/{icon}.svg"
	alt="{icon} icon"
	class="inline-block align-baseline {$$props.class || ''}"
	style="height: calc(1em * var(--cap-height));"
/>
