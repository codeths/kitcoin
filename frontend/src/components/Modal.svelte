<script>
	import {createEventDispatcher, onMount} from 'svelte';
	const dispatch = createEventDispatcher();

	export let title = '';
	let modal;
	let hide = true;

	export function close() {
		hide = true;

		setTimeout(() => {
			modal.style.display = 'none';
			dispatch('close');
		}, 300);
	}

	setTimeout(() => (hide = false), 0);
</script>

<div
	class="fixed z-10 inset-0 overflow-y-auto"
	aria-labelledby="modal-title"
	role="dialog"
	aria-modal="true"
	bind:this={modal}
>
	<div
		class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
	>
		<div
			class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
			aria-hidden="true"
			style={hide ? 'opacity: 0;' : 'opacity: 1;'}
		/>
		<span
			class="hidden sm:inline-block sm:align-middle sm:h-screen"
			aria-hidden="true">&#8203;</span
		>
		<div
			class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
			style={hide
				? 'transform: translateY(calc(-50vh - 50%));'
				: 'transform: translateY(0);'}
		>
			<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
				<h3
					class="text-xl leading-6 font-medium text-gray-900"
					id="modal-title"
				>
					{title}
				</h3>
				<div class="mt-2">
					<slot />
				</div>
			</div>
		</div>
	</div>
</div>
