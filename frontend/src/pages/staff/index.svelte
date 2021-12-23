<script>
	import {metatags, beforeUrlChange} from '@roxi/routify';
	import {getContext} from 'svelte';
	import Loading from '../../components/Loading.svelte';
	import CreateTransaction from '../../components/CreateTransaction.svelte';
	import ToastContainer from '../../components/ToastContainer.svelte';
	import Transactions from '../../components/Transactions.svelte';
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

	let multiSelect = false;
	let multiSelectStudents = new Map();
	let allSelected = false;

	$: {
		if (!multiSelect) {
			multiSelectStudents.clear();
			allSelected = false;
		}
	}

	function toggle(student) {
		multiSelectStudents.has(student.id)
			? multiSelectStudents.delete(student.id)
			: multiSelectStudents.set(student.id, student);
		multiSelectStudents = multiSelectStudents;
	}

	let students = null;
	async function classroomSelect() {
		students = null;
		multiSelect = false;
		students = await getClassStudents(selectedClass).catch(e =>
			e.toString(),
		);
	}
	$: {
		if (students && typeof students !== 'string' && selectedClass) {
			allSelected = students.every(s => multiSelectStudents.has(s.id));
		}
	}

	let transactions;
</script>

<!-- Content -->
<div class="mx-8 my-4">
	<div class="grid grid-cols-12">
		<div class="mx-2 my-4 col-span-12 lg:col-span-7">
			<h1 class="text-3xl font-medium mb-2">Send Kitcoin</h1>
			<div class="bg-base-100 shadow-md rounded px-8 py-8">
				<CreateTransaction
					{balance}
					on:balance={e => (balance = e.detail)}
					on:close={() => transactions.load()}
				/>
			</div>
		</div>
		<div class="mx-2 my-4 col-span-12 md:col-span-5">
			<h1 class="text-3xl font-medium mb-2">Available Kitcoin</h1>
			<div class="lg:col-span-2 sm:max-w-sm lg:max-w-none">
				<div class="flex bg-base-100 shadow-md rounded py-10 min-h-40">
					<h1
						class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
					>
						{#if typeof balance == 'number'}
							<span
								class="icon-currency mr-3"
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
		<div class="mx-2 my-4 col-span-12">
			<div class="bg-base-100 shadow-md rounded px-8 py-8">
				<select
					bind:value={selectedClass}
					on:change={classroomSelect}
					class="select select-bordered w-full"
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
					{#if !students}
						<span
							class="text-center text-1xl sm:text-3xl xl:text-4xl font-medium inline-block w-full mt-4"
						>
							Loading students...
						</span>
					{:else if typeof students == 'string'}
						<span
							class="text-center text-1xl sm:text-3xl xl:text-4xl font-medium inline-block w-full mt-4"
						>
							{students}
						</span>
					{:else}
						<input
							type="checkbox"
							class="hidden"
							bind:checked={multiSelect}
							id="multiselect"
						/>
						<div
							class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-4"
						>
							<label
								for="multiselect"
								type="checkbox"
								class="btn btn-primary mx-4 my-2"
								class:btn-outline={!multiSelect}
								class:btn-secondary={multiSelect}
								>{multiSelect
									? 'Select One'
									: 'Select Multiple'}</label
							>

							{#if multiSelect}
								<label
									for="studentmodal"
									type="checkbox"
									class="btn btn-secondary mx-4 my-2"
									disabled={multiSelectStudents.size == 0 ||
										null}
									on:click={() =>
										(modalStudent = multiSelectStudents)}
									>Manage {multiSelectStudents.size} student{multiSelectStudents.size ==
									1
										? ''
										: 's'}</label
								>
								<div class="flex items-center mx-4 my-2">
									<input
										type="checkbox"
										id="selectall"
										class="checkbox checkbox-secondary"
										bind:checked={allSelected}
										on:input={e => {
											if (allSelected) {
												multiSelectStudents.clear();
											} else {
												students.forEach(s =>
													multiSelectStudents.set(
														s.id,
														s,
													),
												);
											}
											multiSelectStudents =
												multiSelectStudents;
										}}
									/>
									<label for="selectall" class="label"
										>Select All</label
									>
								</div>
							{/if}
							<div class="divider col-start-1 col-span-full" />
							{#each students.sort( (a, b) => a.name.localeCompare(b.name), ) as student}
								{#if multiSelect}
									<button
										class="w-auto btn btn-neutral mx-4 my-2"
										class:btn-outline={!multiSelectStudents.has(
											student.id,
										)}
										class:btn-primary={multiSelectStudents.has(
											student.id,
										)}
										on:click={() => toggle(student)}
										>{student.name}</button
									>
								{:else}
									<label
										for="studentmodal"
										class="w-auto btn btn-neutral btn-outline mx-4 my-2"
										on:click={() =>
											(modalStudent = student)}
										>{student.name}</label
									>
								{/if}
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
		<div class="mx-2 my-4 col-span-12">
			<h1 class="text-4xl font-medium mb-2">Transaction History</h1>
			<div>
				<Transactions
					bind:this={transactions}
					on:balance={e => (balance = e.detail)}
				/>
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
			Send Kitcoin to {multiSelect && multiSelectStudents.size !== 0
				? multiSelectStudents.size > 1
					? `${multiSelectStudents.size} students`
					: Array.from(multiSelectStudents.values())[0].name
				: modalStudent?.name}
		</h2>
		{#key modalStudent}
			<CreateTransaction
				modal="true"
				student={modalStudent}
				class="w-full"
				on:close={e => {
					showModal = false;
					if (e && e.detail == true) {
						transactions.load();
						multiSelect = false;
						setTimeout(
							() =>
								toastContainer.toast(
									'Transaction sent!',
									'success',
								),
							300,
						);
					}
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
