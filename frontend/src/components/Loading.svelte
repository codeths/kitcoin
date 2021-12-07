<script>
	export let color = '';
	export let height = '';
</script>

<div
	class="loader"
	style="--color: {color || '#FFFFFF'}; --height: {height || '5rem'};"
/>

<style>
	.loader,
	.loader:before,
	.loader:after {
		border-radius: 50%;
		width: calc(var(--height) * 0.5);
		height: calc(var(--height) * 0.5);
		-webkit-animation-fill-mode: both;
		animation-fill-mode: both;
		-webkit-animation: load7 1.8s infinite ease-in-out;
		animation: load7 1.8s infinite ease-in-out;
		top: calc(var(--height) * -1);
	}

	.loader {
		color: var(--color);
		font-size: calc(var(--height) * 0.25);
		margin: 0 auto;
		position: relative;
		-webkit-transform: translateZ(0);
		-ms-transform: translateZ(0);
		transform: translateZ(0);
		-webkit-animation-delay: -0.16s;
		animation-delay: -0.16s;
	}
	.loader:before,
	.loader:after {
		content: '';
		position: absolute;
		top: 0;
	}
	.loader:before {
		left: calc(var(--height) * -0.7);
		-webkit-animation-delay: -0.32s;
		animation-delay: -0.32s;
	}
	.loader:after {
		left: calc(var(--height) * 0.7);
	}
	@-webkit-keyframes load7 {
		0%,
		80%,
		100% {
			box-shadow: 0 var(--height) 0 calc(var(--height) * -0.5);
		}
		40% {
			box-shadow: 0 var(--height) 0 0;
		}
	}
	@keyframes load7 {
		0%,
		80%,
		100% {
			box-shadow: 0 var(--height) 0 calc(var(--height) * -0.25);
		}
		40% {
			box-shadow: 0 var(--height) 0 0;
		}
	}
</style>
