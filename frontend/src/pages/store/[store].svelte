<script>
	import {params, url, metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import {
		Loading,
		Input,
		ToastContainer,
		StudentSearch,
		Form,
		DropdownSearch,
	} from '../../components';
	let toastContainer;
	import {storeInfo, getStores, getItems} from '../../utils/store.js';
	import {getBalance} from '../../utils/api.js';

	let info = $storeInfo;
	let nextEl;

	storeInfo.subscribe(newInfo => {
		info = newInfo;
	});

	let storeID, store, storeError;
	$: {
		if ($params.store && storeID !== $params.store) {
			storeID = $params.store;
			if (storeID) {
				getStore()
					.then(x => {
						store = x;
						if (store.canManage) getStudents();
					})
					.catch(e => {
						store = null;
						storeError = e;
					});
				load();
			}
		}
		metatags.title = `Store${
			store && store.name ? ` - ${store.name}` : ''
		} - Kitcoin`;
	}

	let ctx = getContext('userInfo');
	let userInfo;
	let authMsg = null;

	let loading = false;
	let error;
	let items = null;
	let filteredItems = null;
	const LOW_STOCK = 3; //Low stock if there are this many items or less

	let students = null;

	async function getStudents() {
		let res = await fetch(`/api/store/${storeID}/students`).catch(e => {});
		if (!res || !res.ok) throw 'Could not fetch store';
		let json = await res.json().catch(e => {
			throw 'Could not fetch store';
		});
		students = json;
	}

	async function getStore() {
		userInfo = (await ctx) || null;
		if (store) return store;
		let cachedInfo = info && info.find(x => x._id === storeID);
		if (cachedInfo) return cachedInfo;
		let res = await fetch(`/api/store/${storeID}`).catch(e => {});
		if (!res) throw 'Could not fetch store';
		if (res.status == 403) {
			if (!userInfo) authMsg = 'NO_USER';
			if (
				userInfo &&
				!userInfo.scopes.includes(
					'https://www.googleapis.com/auth/classroom.courses.readonly',
				)
			)
				authMsg = 'CLASSROOM';
			throw 'You do not have permission to access this store';
		}
		if (res.status == 404) throw 'This store does not exist';
		if (!res.ok) throw 'Could not fetch store';
		let json = await res.json().catch(e => {
			throw 'Could not fetch store';
		});
		store = json;
		return json;
	}

	async function load(useCache = true) {
		try {
			loading = true;
			items = await getItems(storeID, useCache);
			loading = false;
			error = false;

			return;
		} catch (e) {
			loading = false;
			error = true;
		}
	}

	const ITEM_SORTERS = {
		name: (a, b) =>
			ITEM_SORTERS.newArrival(a, b) || a.name.localeCompare(b.name),
		price_asc: (a, b) => ITEM_SORTERS.newArrival(a, b) || a.price - b.price,
		price_desc: (a, b) =>
			ITEM_SORTERS.newArrival(a, b) || b.price - a.price,
		date_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
		date_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
		newArrival: (a, b) =>
			b.newArrival == a.newArrival
				? 0
				: b.newArrival && !a.newArrival
				? 1
				: -1,
	};

	let selectedSorter = 'name';
	let ACTIVE_SORTER = ITEM_SORTERS[selectedSorter];
	let query = '';

	$: {
		ACTIVE_SORTER = ITEM_SORTERS[selectedSorter];
		filteredItems = items;
		if (filteredItems) {
			filteredItems = filteredItems.sort((a, b) => ACTIVE_SORTER(a, b));
			filteredItems = filteredItems.filter(x =>
				[x.name, x.description].some(
					x =>
						x &&
						x.toLowerCase().includes(query.trim().toLowerCase()),
				),
			);
		}
	}

	let balance = null;
	(async () => {
		balance = await getBalance().catch(e => null);
	})();

	// Manage items
	let manageFormData = {
		isValid: false,
		values: {},
		errors: {},
	};
	let manageForm = manageFormData;
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
		price: e => {
			let v = e.value;
			if (!v) return e.type == 'blur' ? 'Price is required' : '';
			let num = parseFloat(v);
			if (isNaN(num)) return 'Price must be an number';
			if (Math.round(num * 100) / 100 !== num)
				return 'Price cannot have more than 2 decimal places';
			if (num <= 0) return 'Price must be greater than 0';

			return null;
		},
		quantity: e => {
			let v = e.value;
			if (!v) return null;
			let num = parseFloat(v);
			if (isNaN(num))
				return e.type !== 'focus' ? 'Quantity must be an number' : '';
			if (Math.round(num) !== num)
				return e.type !== 'focus'
					? 'Quantity must be a while number'
					: '';
			if (num < 0)
				return e.type !== 'focus'
					? 'Quantity cannot be less than 0'
					: '';

			return null;
		},
	};

	let editItem, editToggle;

	function manageFormModal(item) {
		submitStatus = null;
		editItem = item;
		manageForm.reset();
		if (item) {
			manageForm.values.name = item.name;
			manageForm.values.description = item.description;
			manageForm.values.price = item.price;
			manageForm.values.quantity = item.quantity;
		}
		imageUpload = [];
		deleteImage = false;
	}

	let imageUpload;
	let resetTimeout;
	let deleteImage;
	let imageUploadDrag = false;

	$: {
		if (imageUpload && imageUpload[0]) {
			if (imageUpload[0].size > 5 * 1024 * 1024) {
				alert('Image must be less than 5MB');
				imageUpload = [];
			} else if (
				!['image/png', 'image/jpeg', 'image/webp'].includes(
					imageUpload[0].type,
				)
			) {
				alert('Image must be a PNG, JPEG, or WEBP');
				imageUpload = [];
			}
		}
	}

	let submitStatus;
	async function manageItems(e) {
		e.preventDefault();
		if (!manageFormData.isValid) return false;
		submitStatus = 'LOADING';
		let res = await fetch(
			editItem
				? `/api/store/${storeID}/item/${editItem ? editItem._id : ''}`
				: `/api/store/${storeID}/items`,
			{
				method: editItem ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: manageFormData.values.name,
					description: manageFormData.values.description || null,
					price: parseFloat(manageFormData.values.price),
					quantity: !isNaN(parseFloat(manageFormData.values.quantity))
						? parseFloat(manageFormData.values.quantity)
						: null,
				}),
			},
		).catch(() => null);

		let json = res && res.ok ? await res.json() : null;

		let imageRes;
		if (((imageUpload && imageUpload[0]) || deleteImage) && json) {
			imageRes = await fetch(
				`/api/store/${storeID}/item/${json._id}/image`,
				{
					method: deleteImage ? 'DELETE' : 'PATCH',
					body: deleteImage ? null : imageUpload[0],
				},
			).catch(() => null);
		}

		if (imageRes && imageRes.ok) json = await imageRes.json();

		submitStatus =
			res &&
			res.ok &&
			(!imageUpload || !imageUpload[0] || (imageRes && imageRes.ok))
				? 'SUCCESS'
				: 'ERROR';
		if (submitStatus == 'SUCCESS') {
			editToggle = false;
			setTimeout(() => {
				submitStatus = null;
				toastContainer.toast(
					editItem ? 'Item updated' : 'Item created',
					'success',
				);
			}, 300);

			load(false);
		} else {
			clearTimeout(resetTimeout);
			resetTimeout = setTimeout(() => {
				submitStatus = null;
			}, 3000);
		}

		return false;
	}

	async function deleteItem() {
		if (!confirm(`Are you sure you want to delete ${editItem.name}?`))
			return;
		submitStatus = 'LOADING';

		let res = await fetch(`/api/store/${storeID}/item/${editItem._id}`, {
			method: 'DELETE',
		}).catch(() => null);

		editToggle = false;
		submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
		if (submitStatus == 'SUCCESS') {
			setTimeout(
				() =>
					toastContainer.toast(
						`${editItem.name} deleted.`,
						'success',
					),
				300,
			);
		} else {
			setTimeout(
				() => toastContainer.toast('Error deleting item.', 'error'),
				300,
			);
			return;
		}

		load(false);
	}

	// Transaction
	let studentBalance = null;

	async function loadStudentBalance(e) {
		let studentID = transactionFormData.values.student?.value;
		if (studentID) {
			let res = await fetch(`/api/balance/${studentID}`).catch(
				() => null,
			);
			let json;
			if (res.ok) json = await res.json();
			studentBalance = json.balance ?? null;
		} else {
			studentBalance = null;
		}

		if (transactionForm.validate)
			transactionForm.validate({
				detail: {
					target: {
						name: 'item',
					},
					value: transactionFormData.values.item?.value,
					type: '',
				},
			});
	}

	let transactionToggle;

	let transactionFormData = {
		isValid: false,
		values: {},
		errors: {},
	};
	let transactionForm = transactionFormData;
	let transactionValidate = {
		student: e => {
			let v = e.value?.value;
			if (!v)
				return e && e.type == 'blur'
					? e.query
						? 'Student must be selected from dropdown'
						: 'Student is required'
					: '';
			return null;
		},
		item: e => {
			let v = e.value?.value;
			if (!v)
				return e && e.type == 'blur'
					? e.query
						? 'Item must be selected from dropdown'
						: 'Item is required'
					: '';
			let selectedItem = items.find(i => i._id == v);
			if (!selectedItem) return 'Item not found';
			if (studentBalance !== null && selectedItem.price > studentBalance)
				return 'Insufficient balance';
			return null;
		},
	};

	let itemResults = null;

	function itemSearch(text) {
		text = text.toLowerCase();
		itemResults = (items || [])
			.filter(x => x.name.toLowerCase().includes(text.toLowerCase()))
			.sort((a, b) => {
				if (
					a.name.toLowerCase().startsWith(text) &&
					!b.name.toLowerCase().startsWith(text)
				)
					return -1;
				return a.name.localeCompare(b.name);
			})
			.slice(0, 15)
			.map(x => ({
				value: x._id,
				text: x.name,
				html: `${x.name} - <span class="${
					studentBalance !== null && x.price > studentBalance
						? 'text-error'
						: ''
				}"><span class="icon-currency mr-1"></span>${x.price.toLocaleString(
					[],
					{
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					},
				)}</span>`,
			}));
	}

	async function createTransaction() {
		submitStatus = 'LOADING';

		let res = await fetch(`/api/store/${storeID}/sell`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				user: transactionFormData.values.student.value,
				item: transactionFormData.values.item.value,
			}),
		}).catch(() => null);

		submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
		clearTimeout(resetTimeout);
		resetTimeout = setTimeout(() => {
			submitStatus = null;
		}, 5000);
		if (submitStatus == 'SUCCESS') {
			transactionToggle = false;
			toastContainer.toast(
				`Sold ${transactionFormData.values.item.text}.`,
				'success',
			);
		} else {
			let text = res && (await res.text());
			if (text) toastContainer.toast(text, 'error');
		}

		load(false);
	}

	// Misc

	window.addEventListener('keydown', e => {
		if (
			e.key == 'Escape' &&
			(editToggle || transactionToggle) &&
			confirm('Are you sure you want to close this?')
		) {
			editToggle = false;
			transactionToggle = false;
		}
	});
</script>

<!-- Content -->
<div class="flex flex-row flex-wrap justify-between items-center mt-6">
	<a
		href={$url('.')}
		class="btn btn-primary inline-flex flex-col self-center my-4 w-auto mx-6"
	>
		Back to store list
	</a>
	{#if balance !== null && (!store || !store.canManage)}
		<div
			class="inline-flex flex-col self-center p-4 bg-base-200 rounded-lg mx-6 my-4"
		>
			<span>
				Your balance: <span
					class="icon-currency mr-1"
				/>{balance.toLocaleString([], {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})}</span
			>
		</div>
	{/if}
</div>
<div class="p-6 flex flex-col">
	{#if store === undefined}
		<Loading height="2rem" />
	{:else if store}
		<h2 class="text-4xl font-bold mb-6">{store.name}</h2>
		{#if store.canManage}
			<div class="self-end mb-4">
				{#if userInfo.roles.includes('STAFF')}
					<label
						for="transactionmodal"
						class="btn btn-primary self-end px-12 mx-1 modal-button"
						on:click={() => {
							submitStatus = null;
							transactionForm.reset();
						}}>Sell Item</label
					>
				{/if}
				<label
					for="editmodal"
					class="btn btn-secondary self-end px-12 mx-1 modal-button"
					on:click={() => manageFormModal()}>New Item</label
				>
			</div>
		{/if}
		<div class="flex space-x-2 mb-4">
			<div>
				<Input
					type="select"
					class="w-auto"
					label="Sort by"
					bind:value={selectedSorter}
				>
					<option value="name">Name</option>
					<option value="price_desc">Price (High to Low)</option>
					<option value="price_asc">Price (Low to High)</option>
					<option value="date_desc">Date (Newest to Oldest)</option>
					<option value="date_asc">Date (Oldest to Newest)</option>
				</Input>
			</div>
			<div>
				<Input class="w-auto" label="Search" bind:value={query} />
			</div>
		</div>
		{#if error || !filteredItems || filteredItems.length == 0}
			<h2 class="text-center text-2xl">
				{#if error}
					An Error Occured
				{:else if loading && !items}
					<Loading height="2rem" />
				{:else if items.length > 0 && filteredItems.length == 0}
					No results
				{:else}
					No items
				{/if}
			</h2>
		{:else}
			<div
				class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
			>
				{#each filteredItems as item}
					<div
						class="p-4 bg-base-200 shadow rounded-lg flex flex-col"
					>
						<div class="flex flex-row justify-between items-center">
							<div
								class="flex text-3xl font-semibold items-center"
							>
								<span>{item.name}</span>
								{#if item.newArrival}
									<div class="badge badge-secondary ml-2">
										NEW
									</div>
								{/if}
							</div>
							{#if store.canManage}
								<label
									for="editmodal"
									class="inline-flex btn btn-circle btn-ghost text-3xl modal-button"
									on:click={() => manageFormModal(item)}
									><span class="icon-edit" /></label
								>
							{/if}
						</div>
						<p
							class="text-2xl font-semibold {balance !== null &&
							balance < item.price &&
							!store.canManage
								? 'text-red-500'
								: ''}"
						>
							<span
								class="icon-currency mr-1"
							/>{item.price.toLocaleString([], {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</p>
						{#if item.quantity != null}
							<p class="text-xl font-bold">
								{#if item.quantity == 0}
									<span class="text-red-500"
										>Out of stock</span
									>
								{:else if item.quantity <= LOW_STOCK}
									<span class="text-yellow-400"
										>Only {item.quantity.toLocaleString()} left!</span
									>
								{:else}
									<span class="text-green-400">In stock</span>
									- {item.quantity.toLocaleString()} left
								{/if}
							</p>
						{/if}
						{#if item.description}
							<p class="text-xl mt-2 whitespace-pre-wrap italic">
								{item.description}
							</p>
						{/if}
						<p class="flex-grow" />
						{#key item.imageHash}
							{#if item.imageHash}
								<img
									class="store-item mt-6 object-contain max-h-80"
									src="/api/store/{storeID}/item/{item._id}/image"
									alt={item.name}
									onload="this.style.display = ''"
									onerror="this.style.display = 'none'"
								/>
							{/if}
						{/key}
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<h2>{storeError || 'Something went wrong'}</h2>
		{#if authMsg}
			<div class="alert alert-warning my-4">
				<div class="flex-1">
					<span class="icon-warning" />
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
	{/if}
</div>

<input
	type="checkbox"
	id="editmodal"
	class="modal-toggle"
	bind:checked={editToggle}
/>
<div class="modal">
	<div class="modal-box">
		<div class="flex flex-row justify-between items-center mb-4">
			<h2 class="inline-flex text-2xl text-medium">
				{editItem ? `Edit ${editItem.name}` : 'Create item'}
			</h2>
			{#if editItem}
				<button
					class="inline-flex btn btn-circle btn-ghost text-3xl modal-button"
					on:click={deleteItem}
				>
					<span class="icon-delete" />
				</button>
			{/if}
		</div>
		{#key editItem}
			<Form
				on:submit={manageItems}
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
				<Input
					name="price"
					label="Price"
					bind:value={manageFormData.values.price}
					bind:error={manageFormData.errors.price}
					on:validate={manageForm.validate}
				/>
				<Input
					name="quantity"
					label="Amount available (optional)"
					bind:value={manageFormData.values.quantity}
					bind:error={manageFormData.errors.quantity}
					on:validate={manageForm.validate}
				/>
				<label class="label" for="">
					Image (optional) - PNG, JPEG, or WEBP, max 5MB
				</label>
				<div class="flex w-full">
					{#key imageUpload}
						<label
							for="fileinput"
							class="btn {deleteImage
								? 'btn-disabled'
								: 'btn-primary'} relative flex-grow"
							disabled={deleteImage || null}
							>{deleteImage
								? 'Deleting existing image'
								: imageUploadDrag
								? 'Drop file to upload'
								: imageUpload && imageUpload[0]
								? imageUpload[0].name
								: 'Select a file or drag one here'}
							<input
								type="file"
								id="fileinput"
								class="absolute top-0 right-0 bottom-0 left-0 opacity-0 w-full h-full filedrop cursor-pointer disabled:cursor-not-allowed"
								disabled={deleteImage || null}
								bind:files={imageUpload}
								on:dragenter={() => (imageUploadDrag = true)}
								on:dragleave={() => (imageUploadDrag = false)}
								on:drop={() => (imageUploadDrag = false)}
								accept="image/png image/jpeg image/webp"
							/></label
						>{/key}
					{#if imageUpload && imageUpload[0] && !deleteImage}
						<button
							type="button"
							class="btn btn-ghost text-3xl ml-2"
							on:click={() => (imageUpload = [])}
						>
							<span class="icon-close" />
						</button>
					{/if}
				</div>
				{#if editItem && editItem.imageHash}
					<div class="divider">OR</div>
					<label class="cursor-pointer label justify-start ">
						<input
							type="checkbox"
							class="checkbox checkbox-primary"
							bind:checked={deleteImage}
						/>
						<span class="label-text mx-2"
							>Delete existing image</span
						>
					</label>
				{/if}
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
							{editItem ? 'Done' : 'Create'}
						{/if}
					</button>
				</div>
			</Form>
		{/key}
	</div>
</div>

<input
	type="checkbox"
	id="transactionmodal"
	class="modal-toggle"
	bind:checked={transactionToggle}
/>
<div class="modal">
	<div class="modal-box">
		{#key transactionToggle}
			<Form
				on:submit={createTransaction}
				on:update={() =>
					Object.keys(transactionFormData).forEach(
						key =>
							(transactionFormData[key] = transactionForm[key]),
					)}
				bind:this={transactionForm}
				validators={transactionValidate}
			>
				<StudentSearch
					name="student"
					{students}
					bind:value={transactionFormData.values.student}
					bind:error={transactionFormData.errors.student}
					on:validate={transactionForm.validate}
					on:change={loadStudentBalance}
					next={nextEl?.input?.input}
					focus
				/>
				<DropdownSearch
					name="item"
					label="Item"
					bind:results={itemResults}
					bind:value={transactionFormData.values.item}
					bind:error={transactionFormData.errors.item}
					bind:this={nextEl}
					on:validate={transactionForm.validate}
					on:search={e => itemSearch(e.detail)}
				/>
				<div class="divider" />
				<div class="flex items-center space-x-2 justify-end">
					<label
						for="transactionmodal"
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
							!transactionFormData.isValid}
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
							Sell
						{/if}
					</button>
				</div>
			</Form>{/key}
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
