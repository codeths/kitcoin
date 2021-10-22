<script>
	//This is a workaround to let us set style properties on the body object
	export let styleString = null;
	export let classString = null;
	if (styleString) document.body.style = styleString;
	if (classString) document.body.className = classString;
</script>
