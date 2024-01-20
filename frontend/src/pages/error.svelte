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
		if (window.location.search) {
			let errorCode = window.location.search.slice(1);

			let res = await fetch(`/api/error/${errorCode}`);
			if (res && res.ok) {
				try {
					let json = await res.json();

					error = json;

					for (let key in error) {
						let value = error[key];
						if (value && typeof value == 'string')
							error[key] = value.replace(/\{CODE\}/g, errorCode);
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
	class="p-8 flex flex-col flex-1 justify-center items-center w-screen min-h-full"
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
			href={error.button?.url || '/'}
			target="_self">{error.button?.text || 'Home'}</a
		>
		<a
			class="btn btn-secondary px-12 mx-2"
			href="mailto:kitcoin@eths202.org?subject=Kitcoin%20Error%20-%20{error.code ||
				error.title ||
				'Unknown'}"
			target="_blank">Contact Us</a
		>
	</div>
</div>
