<script>
	let onclick = null;
	let href = null;
	let props = null;
	let additionalClasses = '';
	let bg = 'blue';
	let hoverBg = bg;
	let bgDarkness = '500';
	let hoverDarkness = '700';
	let textColor = 'white';
	$: ({
		onclick,
		href,
		class: additionalClasses,
		bg,
		hoverBh,
		bgDarkness,
		hoverDarkness,
		textColor,
		...props
	} = $$props);

	if (bgDarkness && !bgDarkness.startsWith('-'))
		bgDarkness = `-${bgDarkness}`;
	if (hoverDarkness && !hoverDarkness.startsWith('-'))
		hoverDarkness = `-${hoverDarkness}`;

	let className = `${additionalClasses} bg-${bg}${bgDarkness} hover:bg-${hoverBg}${hoverDarkness} text-${textColor} border transition-colors duration-300 font-bold px-4 rounded w-32 h-10 flex items-center justify-center text-center`;
</script>

{#if href}
	<a {href} class={className} {...props}>
		<slot />
	</a>
{:else}
	<button {onclick} class={className} {...props}>
		<slot />
	</button>
{/if}
