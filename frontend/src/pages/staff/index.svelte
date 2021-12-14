<script>
	import {metatags, beforeUrlChange} from '@roxi/routify';
	import {getContext} from 'svelte';
	import Loading from '../../components/Loading.svelte';
	import CreateTransaction from '../../components/CreateTransaction.svelte';
	import ToastContainer from '../../components/ToastContainer.svelte';
	let toastContainer;
	import {getBalance, getClasses, getClassStudents} from '../../utils/api.js';

	metatags.title = 'Staff Home - Kitcoin';

	let selectedClass = '';
	let classList = [];
	let selectMsg = 'Loading classes...';

	let balance;

	let ctx = getContext('userInfo');
	let showPermsModal = false;

	(async () => {
		let info = (await ctx) || null;
		if (!info || !info.roles.includes('STAFF')) {
			window.location.reload();
		}
		showPermsModal = [
			'https://www.googleapis.com/auth/classroom.courses.readonly',
			'https://www.googleapis.com/auth/classroom.rosters.readonly',
		].some(x => !info.scopes.includes(x));
	})();

	getBalance().then(b => (balance = b));

	getClasses('teacher')
		.then(classes => {
			classList = classes.sort((a, b) => a.name.localeCompare(b.name));
			selectMsg = 'Select a class';
		})
		.catch(err => {
			selectMsg = err;
		});
	let modalStudent = null,
		showModal = false;
</script>

<!-- Content -->
<div class="mx-8 my-4">
	<div class="lg:grid lg:grid-cols-12">
		<div class="lg:col-span-7 lg:mx-2 my-4">
			<h1 class="text-3xl font-medium mb-2">Send Kitcoin</h1>
			<div class="bg-base-200 shadow-md rounded px-8 py-8">
				<CreateTransaction
					{balance}
					on:balance={e => (balance = e.detail)}
				/>
			</div>
		</div>
		<div class="lg:col-span-5 lg:mx-2 my-4">
			<h1 class="text-3xl font-medium mb-2">Available Kitcoin</h1>
			<div class="lg:col-span-2 sm:max-w-sm lg:max-w-none">
				<div
					class="flex bg-base-200 shadow-md rounded py-10 min-h-40 border-t-8 border-blue-eths"
				>
					<h1
						class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
					>
						{#if typeof balance == 'number'}
							<span
								class="icon-currency mr-1"
							/>{balance.toLocaleString([], {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						{:else if balance}
							{balance}
						{:else}
							<Loading height="2rem" />
						{/if}
					</h1>
				</div>
			</div>
		</div>
		<div class="lg:col-span-12 lg:mx-2 my-4">
			<div class="bg-base-200 shadow-md rounded px-8 py-8">
				<select
					bind:value={selectedClass}
					class="select select-bordered w-full mb-4"
				>
					<option disabled value="" selected>
						{selectMsg}
					</option>
					{#each classList as classroom}
						<option value={classroom.id}>
							{classroom.name}
						</option>
					{/each}
				</select>
				{#if selectedClass}
					{#await getClassStudents(selectedClass)}
						<span
							class="text-center text-1xl sm:text-3xl xl:text-4xl font-medium inline-block w-full"
						>
							Loading students...
						</span>
					{:then students}
						<div
							class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
						>
							{#each students.sort( (a, b) => a.name.localeCompare(b.name), ) as student}
								<label
									for="studentmodal"
									class="w-auto btn btn-neutral btn-outline mx-4 my-2"
									on:click={() => (modalStudent = student)}
									>{student.name}</label
								>
							{/each}
						</div>
					{:catch error}
						<span
							class="text-center text-1xl sm:text-3xl xl:text-4xl font-medium inline-block w-full"
						>
							{error}
						</span>
					{/await}
				{/if}
			</div>
		</div>
	</div>
</div>

<input
	type="checkbox"
	id="studentmodal"
	class="modal-toggle"
	bind:checked={showModal}
/>
<label class="modal" for="studentmodal">
	<div class="modal-box">
		<h2 class="text-2xl text-medium mb-4">
			Send Kitcoin to {modalStudent?.name}
		</h2>
		{#key modalStudent}
			<CreateTransaction
				modal="true"
				student={modalStudent}
				class="w-full"
				on:close={e => {
					showModal = false;
					if (e && e.detail == true)
						setTimeout(
							() =>
								toastContainer.toast(
									'Transaction sent!',
									'success',
								),
							300,
						);
				}}
				{balance}
				on:balance={e => (balance = e.detail)}
			/>
		{/key}
	</div>
</label>
{#if showPermsModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h2 class="text-2xl text-medium mb-4">Missing Permissions</h2>
			<p>
				Kitcoin is unable to access your Google Classroom classes.
				Please log in again using the button below and make sure to
				click these checkboxes:
			</p>
			<img
				src="/assets/perms-image.png"
				class="w-full mt-2 mb-4 border rounded-lg"
				alt="How to enable the permissions"
			/>
			<div
				class="flex flex-col items-end pt-4 border-t-2 border-gray-300"
			>
				<a
					class="btn btn-primary px-12"
					target="_self"
					href="/login/staff?hint=true">Log In</a
				>
			</div>
		</div>
	</div>
{/if}

<ToastContainer bind:this={toastContainer} />
