<script>
	export let icon = '';
</script>

<svg
	class="inline-block align-baseline {$$props.class || ''}"
	style="height: calc(1em * var(--cap-height));"
	alt="{icon} icon"
>
	<use href="assets/icons/{icon}.svg#icon" />
</svg>
