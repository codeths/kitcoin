<script>
	import Header from '../../components/Header.svelte';
	import CreateTransaction from '../../components/CreateTransaction.svelte';
	import Modal from '../../components/Modal.svelte';
	import ToastContainer from '../../components/ToastContainer.svelte';
	let toastContainer;

	import {
		getBalance,
		getTransactions,
		getClasses,
		getClassStudents,
	} from '../../utils/api.js';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	import Auth from '../../utils/Auth.svelte';

	let selectedClass = '';
	let classList = [];
	let selectMsg = 'Loading classes...';

	let balance;

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
		modal = null;
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200" />
<Auth />
<Header />

<!-- Content -->
<div class="grid gap-4 grid-cols-4 mx-14 my-8 lg:mx-24 lg:my-14">
	<div class="col-span-4 md:col-span-2">
		<h1 class="text-3xl font-medium mb-2">Send KitCoin</h1>
		<div class="bg-white shadow-md rounded px-8 py-8">
			<CreateTransaction />
		</div>
	</div>
	<div class="col-span-4 md:col-span-2">
		<h1 class="text-3xl font-medium mb-2">Available KitCoin</h1>
		<div class="lg:col-span-2 sm:max-w-sm lg:max-w-none">
			<div
				class="flex bg-white shadow-md rounded py-10 border-t-8 border-blue-900"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full"
				>
					{#if typeof balance == 'number'}
						<span
							class="icon icon-currency mr-3"
						/>{balance.toLocaleString([], {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					{:else if balance}
						{balance}
					{:else}
						Loading...
					{/if}
				</h1>
			</div>
		</div>
	</div>
	<div class="col-span-4">
		<div class="bg-white shadow-md rounded px-8 py-8">
			<select
				bind:value={selectedClass}
				class="border shadow rounded w-full py-2 px-3 mb-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{#each students.sort( (a, b) => a.name.localeCompare(b.name), ) as student}
							<button
								class="shadow border rounded hover:shadow-md hover:bg-gray-100 transition-all transition-colors duration-300 py-2 px-4 mx-4 my-2 rounded flex items-center justify-center text-center"
								on:click={() => (modalStudent = student)}
								>{student.name}</button
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

{#if modalStudent}
	<Modal
		title="Send KitCoin"
		on:close={e => {
			modalStudent = null;
		}}
		on:confirm={() => {
			modalStudent = null;
		}}
		bind:this={modal}
	>
		<CreateTransaction
			modal="true"
			student={modalStudent}
			class="w-full"
			on:close={e => {
				modal.close();
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
		/>
	</Modal>
{/if}

<ToastContainer bind:this={toastContainer} />
