<script>
	import {getContext} from 'svelte';
	import {url, metatags} from '@roxi/routify';
	import {
		Loading,
		ToastContainer,
		Form,
		Input,
		StudentSearch,
		ClassroomSearch,
		NewArrivals,
	} from '../../components';
	let toastContainer;
	import {getStores} from '../../utils/store';
	import {getClasses} from '../../utils/api';

	metatags.title = 'Stores - Kitcoin';

	let ctx = getContext('userInfo');
	let authMsg = null;
	let userInfo;
	(async () => {
		userInfo = (await ctx) || null;
		if (!userInfo) return (authMsg = 'NO_USER');
		if (
			!userInfo.scopes.includes(
				'https://www.googleapis.com/auth/classroom.courses.readonly',
			)
		)
			authMsg = 'CLASSROOM';
	})();

	let query = '';
	let user = undefined;

	let stores = undefined;
	async function load(useCache) {
		stores = undefined;
		await getStores(
			useCache,
			query.trim() || undefined,
			user?.value || undefined,
		)
			.then(x => {
				stores = x;
			})
			.catch(e => {
				stores = null;
			});
		return;
	}
	load();

	// Manage items
	let manageFormData = {
		isValid: false,
		values: {},
		errors: {},
	};
	let manageForm;
	let manageValidators = {
		name: e => {
			let v = e.value;
			if (!v) return e && e.type == 'blur' ? 'Name is required' : '';
			return null;
		},
		description: e => {
			let v = e.value;
			return null;
		},
		classIDs: e => {
			let v = e.value;
			return null;
		},
		public: e => {
			let v = e.value;
			return null;
		},
		pinned: e => {
			let v = e.value;
			return null;
		},
		allowDeductions: e => {
			let v = e.value;
			return null;
		},
		requests: e => {
			let v = e.value;
			return null;
		},
		classes: e => {
			let v = e.value?.value;
			return null;
		},
		managers: e => {
			let v = e.value?.value;
			return null;
		},
		users: e => {
			let v = e.value?.value;
			return null;
		},
		owner: e => {
			let v = e.value?.value;
			if (!v) return e && e.type == 'blur' ? 'Owner is required' : '';
			return null;
		},
	};

	let modalStore = null;
	let modalOpen = false;
	let submitStatus = null;
	let resetTimeout;

	let extraClasses = [];
	let classes;

	async function setModalStore(store) {
		submitStatus = null;
		classes = store ? await getClasses('teacher') : null;
		extraClasses = [];
		manageForm.reset();
		modalStore = store;
		if (store) {
			manageForm.values.name = modalStore.name;
			manageForm.values.description = modalStore.description;
			extraClasses = modalStore.classIDs.map(x => {
				let classData = classes.find(c => c.id == x);

				return classData
					? {
							text: classData.name,
							value: classData.id,
					  }
					: {
							text: `Unknown Class (${x})`,
							value: x,
					  };
			});
			manageForm.values.classes = extraClasses;
			manageForm.values.public = modalStore.public;
			manageForm.values.pinned = modalStore.pinned;
			manageForm.values.requests = modalStore.requests;
			manageForm.values.allowDeductions = modalStore.allowDeductions;
			manageForm.values.managers = modalStore.managers.map(x => ({
				text: x.name,
				value: x.id,
			}));
			manageForm.values.users = modalStore.users.map(x => ({
				text: x.name,
				value: x.id,
			}));
			manageForm.values.owner = {
				text: modalStore.owner.name,
				value: modalStore.owner.id,
			};
		}
		modalOpen = true;
	}

	async function doManageStore(e) {
		e.preventDefault();
		if (!manageFormData.isValid) return false;
		if (
			modalStore &&
			modalStore._id &&
			!(
				userInfo &&
				(userInfo.roles.includes('ADMIN') ||
					manageFormData.values.owner?.value == userInfo._id ||
					(manageFormData.values.managers || []).some(
						x => x.value == userInfo._id,
					))
			) &&
			!(
				classes &&
				(manageFormData.values.classes || []).some(x =>
					classes.some(c => c.id == x.value),
				)
			)
		) {
			if (
				!confirm(
					'You will not be able to manage this store after this. Are you sure?',
				)
			)
				return;
		} else if (
			modalStore &&
			modalStore._id &&
			userInfo &&
			!userInfo.roles.includes('ADMIN') &&
			modalStore.owner.id == userInfo._id &&
			manageFormData.values.owner?.value !== userInfo._id
		) {
			if (
				!confirm(
					'Are you sure you want to remove yourself as the store owner?',
				)
			)
				return;
		}

		if (manageFormData.values.public == '')
			manageFormData.values.public = false;
		if (manageFormData.values.pinned == '')
			manageFormData.values.pinned = false;
		if (manageFormData.values.allowDeductions == '')
			manageFormData.values.allowDeductions = false;

		submitStatus = 'LOADING';
		let res = await fetch(
			modalStore ? `/api/store/${modalStore._id}` : `/api/store`,
			{
				method: modalStore ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: manageFormData.values.name,
					description: manageFormData.values.description || null,
					classIDs: (manageFormData.values.classes || []).map(
						x => x.value,
					),
					public:
						manageFormData.values.public ??
						(modalStore ? modalStore.public : false),
					pinned:
						manageFormData.values.pinned ??
						(modalStore ? modalStore.pinned : false),
					allowDeductions:
						manageFormData.values.allowDeductions ??
						(modalStore ? modalStore.allowDeductions : false),
					requests: manageFormData.values.requests,
					managers: (manageFormData.values.managers || []).map(
						x => x.value,
					),
					users: (manageFormData.values.users || []).map(
						x => x.value,
					),
					owner: manageFormData.values.owner?.value,
				}),
			},
		).catch(() => null);

		if (res && res.ok) {
			await load(false);
			modalOpen = false;
			submitStatus = 'SUCCESS';
			setTimeout(() => {
				submitStatus = null;
				toastContainer.toast(
					modalStore ? 'Store updated' : 'Store created',
					'success',
				);
			}, 300);
		} else {
			clearTimeout(resetTimeout);
			submitStatus = 'ERROR';
			resetTimeout = setTimeout(() => {
				submitStatus = null;
			}, 3000);
		}

		return false;
	}

	async function deleteStore() {
		if (!confirm(`Are you sure you want to delete ${modalStore.name}?`))
			return;
		submitStatus = 'LOADING';

		let res = await fetch(`/api/store/${modalStore._id}`, {
			method: 'DELETE',
		}).catch(() => null);

		if (res && res.ok) {
			await load(false);
			modalOpen = false;
			submitStatus = 'SUCCESS';
			setTimeout(
				() =>
					toastContainer.toast(
						`${modalStore.name} deleted.`,
						'success',
					),
				300,
			);
		} else {
			submitStatus = 'ERROR';
			setTimeout(
				() => toastContainer.toast('Error deleting store.', 'error'),
				300,
			);
			return;
		}
	}

	let requests = null;
	async function getRequests() {
		let res = await fetch(`/api/store/requests`).catch(() => null);

		if (!res) return;

		requests = await res.json();
	}
	getRequests();

	async function cancelRequest(id) {
		if (!confirm('Are you sure you want to cancel this request?')) return;

		let res = await fetch(`/api/store/request/${id}`, {
			method: 'DELETE',
		}).catch(() => null);

		if (res.ok) {
			toastContainer.toast('Request cancelled.', 'success');
		} else {
			toastContainer.toast('Error cancelling request.', 'error');
		}

		getRequests();
	}
</script>

<!-- Content -->
<div class="px-12 my-6 flex flex-col">
	<h2 class="text-4xl font-bold mb-6">Your Stores</h2>
	{#if authMsg}
		<div class="alert alert-error my-4">
			<div class="flex-1 items-center">
				<span class="icon-warning text-2xl align-middle mr-2" />
				<span>
					{#if authMsg == 'NO_USER'}
						You are not logged in. <a
							href="/signin?redirect={encodeURIComponent(
								window.location.pathname,
							)}&hint=true"
							class="link font-bold"
							target="_self">Sign in</a
						> to view your private stores.
					{:else if authMsg == 'CLASSROOM'}
						Kitcoin is unable to access your Google Classroom
						classes. <a
							href="/signin?redirect={encodeURIComponent(
								window.location.pathname,
							)}&hint=true"
							class="link font-bold"
							target="_self">Sign in</a
						> again to grant the permission.
					{/if}
				</span>
			</div>
		</div>
	{/if}
	{#if userInfo && (userInfo.roles.includes('STAFF') || userInfo.roles.includes('ADMIN'))}
		<div class="self-end mb-4">
			<button
				for="editmodal"
				class="btn btn-secondary self-end px-12 mx-1 modal-button"
				on:click={() => setModalStore()}>New Store</button
			>
		</div>
	{/if}
	{#if userInfo && userInfo.roles.includes('ADMIN')}
		<div class="flex space-x-4 mb-4">
			<div>
				<StudentSearch
					parentClass="items-center h-12"
					label="User"
					roles={null}
					bind:value={user}
					on:change={() => load(false)}
				/>
			</div>
			<div>
				<Input
					parentClass="items-center h-12"
					label="Search"
					bind:value={query}
					on:change={() => load(false)}
				/>
			</div>
		</div>
	{/if}
	{#if stores === undefined}
		<div class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40">
			<Loading height="2rem" />
		</div>
	{:else if stores}
		{#if stores.length > 0}
			<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{#each stores as store}
					<a
						href={$url('./:store', {store: store._id})}
						class="group p-4 bg-base-100 hover:bg-primary hover:text-primary-content hover:scale-110 shadow rounded-lg flex flex-col transition duration-300"
					>
						<div class="flex flex-row justify-between items-center">
							<p class="inline-flex text-2xl font-semibold">
								{#if store.pinned}
									<span
										class="icon-pin mr-2 text-secondary group-hover:text-primary-content transition duration-300"
									/>
								{/if}
								{store.name}
							</p>
							{#if store.canManage}
								<button
									class="inline-flex btn btn-circle btn-ghost text-3xl modal-button"
									on:click={e => {
										e.preventDefault();
										setModalStore(store);
									}}
									><span
										class="inline-flex icon-edit text-2xl text-base-content group-hover:text-primary-content transition duration-300"
									/></button
								>
							{/if}
						</div>
						{#if store.description}
							<p>
								{store.description}
							</p>
						{/if}
						<p class="italic">
							{#if store.public}
								Available to everyone
							{:else if store.classNames.length > 0}
								For {store.classNames.join(', ')}
							{:else}
								Private
							{/if}
						</p>
					</a>
				{/each}
			</div>
		{:else}
			<div class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40">
				<span
					class="text-center text-3xl flex justify-center items-center w-full h-full"
				>
					No stores available.
				</span>
			</div>
		{/if}
	{:else}
		<div class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40">
			<span
				class="text-center text-3xl flex justify-center items-center w-full h-full"
			>
				Error loading stores.
			</span>
		</div>
	{/if}
</div>
{#if userInfo == null || (userInfo && userInfo.roles.includes('STUDENT'))}
	<div class="px-12 my-6 flex flex-col w-screen">
		<h1 class="text-3xl font-medium mb-2">New Arrivals</h1>
		<NewArrivals />
	</div>

	<div class="px-12 my-6 flex flex-col w-screen">
		<h1 class="text-3xl font-medium mb-2">Purchase requests</h1>
		<div
			class="flex bg-base-100 shadow-md rounded-lg py-10 min-h-40 overflow-x-auto"
		>
			{#if !requests}
				<span
					class="text-center text-3xl flex justify-center items-center w-full h-full"
				>
					Loading...
				</span>
			{:else if requests.length > 0}
				<table class="w-full table-auto">
					<thead class="w-full">
						<tr class="text-left border-b border-gray-300">
							<th class="p-4" />
							<th class="p-4">Date</th>
							<th class="p-4">Store</th>
							<th class="p-4">Item</th>
							<th class="p-4">Quantity</th>
							<th class="p-4">Price</th>
							<th class="p-4" />
						</tr>
					</thead>
					<tbody class="w-full divide-y divide-gray-300">
						{#each requests as request}
							<tr>
								<td class="p-4">
									{#if request.status == 'PENDING'}
										<div class="badge badge-warning">
											Pending
										</div>
									{/if}
									{#if request.status == 'APPROVED'}
										<div class="badge badge-success">
											Approved
										</div>
									{/if}
									{#if request.status == 'DENIED'}
										<div class="badge badge-error">
											Denied
										</div>
									{/if}
									{#if request.status == 'CANCELLED'}
										<div class="badge badge-error">
											Cancelled
										</div>
									{/if}
								</td>
								<td class="p-4">
									{new Date(
										request.date,
									).toLocaleDateString()}
									{new Date(request.date).toLocaleTimeString(
										[],
										{
											hour: 'numeric',
											minute: '2-digit',
										},
									)}</td
								>
								<td class="p-4">{request.store.name}</td>
								<td class="p-4">{request.item.name}</td>
								<td class="p-4">{request.quantity}</td>
								<td class="p-4"
									><span
										class="icon-currency mx-1"
									/>{request.price.toLocaleString([], {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}</td
								>
								<td class="p-4">
									{#if request.status == 'PENDING'}
										<button
											class="btn-circle btn-ghost text-2xl"
											on:click={() =>
												cancelRequest(request._id)}
										>
											<span class="icon-delete" />
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<span
					class="text-center text-3xl flex justify-center items-center w-full h-full"
				>
					No purchase requests.
				</span>
			{/if}
		</div>
	</div>
{/if}

<input
	type="checkbox"
	id="editmodal"
	class="modal-toggle"
	bind:checked={modalOpen}
/>
<div class="modal">
	<div class="modal-box">
		<div class="flex flex-row justify-between items-center mb-4">
			<h2 class="inline-flex text-2xl text-medium">
				{modalStore ? `Edit ${modalStore.name}` : 'Create store'}
			</h2>
			{#if modalStore && (modalStore.owner.id === userInfo._id || userInfo.roles.includes('ADMIN'))}
				<button
					class="inline-flex btn btn-circle btn-ghost text-3xl modal-button"
					on:click={deleteStore}
				>
					<span class="icon-delete" />
				</button>
			{/if}
		</div>
		{#key modalStore}
			<Form
				on:submit={doManageStore}
				on:update={() =>
					Object.keys(manageFormData).forEach(
						key => (manageFormData[key] = manageForm[key]),
					)}
				bind:this={manageForm}
				validators={manageValidators}
			>
				<Input
					name="name"
					label="Name"
					bind:value={manageFormData.values.name}
					bind:error={manageFormData.errors.name}
					on:validate={manageForm.validate}
				/>
				<Input
					name="description"
					label="Description (optional)"
					type="textarea"
					bind:value={manageFormData.values.description}
					bind:error={manageFormData.errors.description}
					on:validate={manageForm.validate}
				/>
				{#key extraClasses}
					<ClassroomSearch
						name="classes"
						label="Classes who can access this store (optional)"
						bind:value={manageFormData.values.classes}
						bind:error={manageFormData.errors.classes}
						on:validate={manageForm.validate}
						role="teacher"
						{extraClasses}
						multiselect
					/>
				{/key}
				<StudentSearch
					name="users"
					label="Additional users who can access this store (optional)"
					roles={null}
					me="true"
					bind:value={manageFormData.values.users}
					bind:error={manageFormData.errors.users}
					on:validate={manageForm.validate}
					multiselect
				/>
				<StudentSearch
					name="managers"
					label="Additional users who can manage this store (optional)"
					roles={null}
					me="true"
					bind:value={manageFormData.values.managers}
					bind:error={manageFormData.errors.managers}
					on:validate={manageForm.validate}
					multiselect
				/>
				{#if modalStore && userInfo && ((modalStore && modalStore.owner.id == userInfo._id) || userInfo.roles.includes('ADMIN'))}
					<StudentSearch
						name="owner"
						label="Owner"
						roles={null}
						me="true"
						bind:value={manageFormData.values.owner}
						bind:error={manageFormData.errors.owner}
						on:validate={manageForm.validate}
					/>
				{/if}
				{#if userInfo && userInfo.roles.includes('ADMIN')}
					<Input
						name="public"
						label="Public"
						type="switch"
						bind:value={manageFormData.values.public}
						bind:error={manageFormData.errors.public}
						on:validate={manageForm.validate}
					/>
					<Input
						name="allowDeductions"
						label="Allow deductions from price when selling items"
						type="switch"
						bind:value={manageFormData.values.allowDeductions}
						bind:error={manageFormData.errors.allowDeductions}
						on:validate={manageForm.validate}
					/>
					<Input
						name="pinned"
						label="Pin this store to the top of the list"
						type="switch"
						disabled={!manageFormData.values.public}
						bind:value={manageFormData.values.pinned}
						bind:error={manageFormData.errors.pinned}
						on:validate={manageForm.validate}
					/>
				{/if}
				<Input
					name="requests"
					label="Allow students to request to buy items"
					type="switch"
					bind:value={manageFormData.values.requests}
					bind:error={manageFormData.errors.requests}
					on:validate={manageForm.validate}
				/>

				<div class="divider" />
				<div class="flex items-center space-x-2 justify-end">
					<label
						for="editmodal"
						class="btn btn-outline px-12"
						on:click={e =>
							!confirm('Are you sure you want to close this?') &&
							e.preventDefault()}
					>
						Cancel
					</label>
					<button
						type="submit"
						disabled={submitStatus == 'LOADING' ||
							!manageFormData.isValid}
						class="btn {submitStatus == 'ERROR'
							? 'btn-error'
							: 'btn-primary'} px-12 disabled:border-0"
					>
						{#if submitStatus == 'LOADING'}
							<div class="px-2">
								<Loading height="2rem" />
							</div>
						{:else if submitStatus == 'ERROR'}
							Error
						{:else}
							{modalStore ? 'Done' : 'Create'}
						{/if}
					</button>
				</div>
			</Form>
		{/key}
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
