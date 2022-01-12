<script>
	import {metatags} from '@roxi/routify';

	metatags.title = 'Error - Kitcoin';

	let error = {
		code: null,
		title: null,
		description: null,
		button: null,
	};

	(async () => {
		if (window.location.hash) {
			let errorCode = window.location.hash.slice(1);

			let res = await fetch(`/api/error/${errorCode}`);
			if (res && res.ok) {
				try {
					let json = await res.json();

					error = json;

					for (let key in error) {
						let value = error[key];
						if (value)
							key[value] = value.replace(/\{CODE\}/g, errorCode);
					}

					return;
				} catch (e) {}
			}
		}

		error = {
			title: 'Something went wrong',
			description: 'If the issue persists, please contact us.',
		};
	})();
</script>

<!-- Content -->
<div
	class="p-8 flex flex-col flex-1 justify-center items-center absolute w-screen min-h-full"
>
	{#if error.code}
		<h1 class="text-8xl text-center">{error.code}</h1>
	{/if}
	{#if error.title}
		<h1 class="text-6xl text-center">{error.title}</h1>
	{/if}
	{#if error.description}
		<h2 class="text-4xl text-center my-6">{error.description}</h2>
	{/if}

	<div class="inline-flex">
		<a
			class="btn btn-primary px-12 mx-2"
			href={error.button ? error.button.url : '#'}
			on:click={() => {
				if (!error.button?.url) window.history.back();
			}}
			target="_self">{error.button?.text || 'Back'}</a
		>
		<a
			class="btn btn-secondary px-12 mx-2"
			href="mailto:emailtbd@eths202.org"
			target="_blank">Contact Us</a
		>
	</div>
</div>
