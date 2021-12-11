<script>
	import {metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import Loading from '../../components/Loading.svelte';
	import CreateTransaction from '../../components/CreateTransaction.svelte';
	import Modal from '../../components/Modal.svelte';
	import Button from '../../components/Button.svelte';
	import ToastContainer from '../../components/ToastContainer.svelte';
	let toastContainer;
	import {getBalance, getClasses, getClassStudents} from '../../utils/api.js';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	import Auth from '../../utils/Auth.svelte';

	metatags.title = 'Staff Home - Kitcoin';

	let selectedClass = '';
	let classList = [];
	let selectMsg = 'Loading classes...';

	let balance;

	let ctx = getContext('userInfo');
	let userInfo;
	let showPermsModal = false;
	(async () => {
		userInfo = (await ctx) || null;
		if (!userInfo) return;
		showPermsModal = [
			'https://www.googleapis.com/auth/classroom.courses.readonly',
			'https://www.googleapis.com/auth/classroom.rosters.readonly',
		].some(x => !userInfo.scopes.includes(x));
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
		modal = null;
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200" />
<Auth />

<!-- Content -->
<div class="grid gap-4 grid-cols-4 mx-14 my-8 lg:mx-24 lg:my-14">
	<div class="col-span-4 md:col-span-2">
		<h1 class="text-3xl font-medium mb-2">Send KitCoin</h1>
		<div class="bg-white shadow-md rounded px-8 py-8">
			<CreateTransaction
				{balance}
				on:balance={e => (balance = e.detail)}
			/>
		</div>
	</div>
	<div class="col-span-4 md:col-span-2">
		<h1 class="text-3xl font-medium mb-2">Available KitCoin</h1>
		<div class="lg:col-span-2 sm:max-w-sm lg:max-w-none">
			<div
				class="flex bg-white shadow-md rounded py-10 min-h-40 border-t-8 border-blue-900"
			>
				<h1
					class="text-center text-6xl sm:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
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
						<Loading height="2rem" color="#000000" />
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
							<Button
								class="w-auto border shadow hover:shadow-md mx-4 my-2"
								bg="white"
								bgDarkness=""
								hoverBg="gray"
								hoverDarkness="100"
								textColor="black"
								on:click={() => (modalStudent = student)}
								>{student.name}</Button
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
			{balance}
			on:balance={e => (balance = e.detail)}
		/>
	</Modal>
{/if}
{#if showPermsModal}
	<Modal title="Missing Permissions" canclose="false">
		<p>
			KitCoin is unable to access your Google Classroom classes. Please
			log in again using the button below and make sure to click these
			checkboxes:
		</p>
		<img
			src="/assets/perms-image.png"
			class="w-full mt-2 mb-4 border"
			alt="How to enable the permissions"
		/>
		<div class="flex flex-col items-end pt-4 border-t-2 border-gray-300">
			<Button target="_self" href="/login/staff?hint=true">Log In</Button>
		</div>
	</Modal>
{/if}

<ToastContainer bind:this={toastContainer} />
