<script>
	let additionalClasses = '';
	export {additionalClasses as class};
	export let onclick = null;
	export let href = null;
	export let bg = null;
	export let hoverBg = null;
	export let bgDarkness = null;
	export let hoverDarkness = null;
	export let textColor = null;
	export let textDarkness = null;

	let className = '';
	$: {
		let calcedBg = bg || 'blue';
		let caledHoverBg = hoverBg || calcedBg;
		let calcedTextColor = textColor || 'white';
		let calcedBgDarkness = bgDarkness || '500';
		let calcedHoverBgDarkness = hoverDarkness || '700';
		let calcedTextDarkness = textDarkness || '';

		if (calcedBgDarkness && !calcedBgDarkness.startsWith('-'))
			calcedBgDarkness = `-${calcedBgDarkness}`;
		if (calcedHoverBgDarkness && !calcedHoverBgDarkness.startsWith('-'))
			calcedHoverBgDarkness = `-${calcedHoverBgDarkness}`;
		if (calcedTextDarkness && !calcedTextDarkness.startsWith('-'))
			calcedTextDarkness = `-${calcedTextDarkness}`;

		className = `${additionalClasses} bg-${calcedBg}${calcedBgDarkness} hover:bg-${caledHoverBg}${calcedHoverBgDarkness} text-${calcedTextColor}${calcedTextDarkness} disabled:bg-gray-400 disabled:text-white disabled:cursor-not-allowed transition-colors duration-300 px-4 rounded w-32 h-10 flex items-center justify-center text-center`;
	}
</script>

{#if href}
	<a {href} class={className} {...$$restProps} on:click on:hover on:focus>
		<slot />
	</a>
{:else}
	<button
		{onclick}
		class={className}
		{...$$restProps}
		on:click
		on:hover
		on:focus
	>
		<slot />
	</button>
{/if}
