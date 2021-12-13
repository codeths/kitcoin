<script>
	import {params, url, metatags} from '@roxi/routify';
	import {getContext} from 'svelte';
	import Loading from '../../components/Loading.svelte';
	import Input from '../../components/Input.svelte';
	import ToastContainer from '../../components/ToastContainer.svelte';
	let toastContainer;
	import {storeInfo, getStores, getItems} from '../../utils/store.js';
	import {getBalance} from '../../utils/api.js';

	let info = $storeInfo;

	storeInfo.subscribe(newInfo => {
		info = newInfo;
	});

	let storeID, store;
	$: {
		if (storeID !== $params.store) {
			storeID = $params.store;
			store = (info || []).find(s => s._id === storeID);
			if (storeID) {
				load(null, null, true);
				if (!info) getStores(storeID);
			}
		}
		metatags.title = `Store${
			store && store.name ? ` - ${store.name}` : ''
		} - Kitcoin`;
	}

	let ctx = getContext('userInfo');
	let authMsg = null;

	let loading = false;
	let error;
	let items = null;
	let currentPage = 1;

	async function getStore() {
		let cachedInfo = info && info.find(x => x._id === storeID);
		if (cachedInfo) return cachedInfo;
		let res = await fetch(`/api/store/${storeID}`).catch(e => {});
		if (!res) throw 'Could not fetch store';
		if (res.status == 403) {
			let info = (await ctx) || null;
			if (!info) authMsg = 'NO_USER';
			if (
				info &&
				!info.scopes.includes(
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
		return json;
	}

	async function load(page, which, useCache) {
		try {
			loading = which || true;
			let newItems = await getItems(
				storeID,
				page || currentPage,
				useCache,
			);
			items = newItems;
			if (items.page < items.pageCount)
				getItems(storeID, items.page + 1, true);
			loading = false;
			error = false;
			if (page) currentPage = page;
			return;
		} catch (e) {
			loading = false;
			error = true;
		}
	}

	let balance = null;
	(async () => {
		balance = await getBalance().catch(e => null);
	})();

	let values = {
		name: null,
		description: null,
		price: null,
		quantity: null,
	};

	let errors = {
		name: null,
		description: null,
		price: null,
		quantity: null,
	};

	let valid = {
		name: null,
		description: null,
		price: null,
		quantity: null,
	};

	let inputs = {};

	let hasError = true;

	$: {
		hasError = Object.values(valid).some(v => !v);
	}

	let formValidators = {
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
			if (num <= 0)
				return e.type !== 'focus'
					? 'Quantity must be greater than 0'
					: '';

			return null;
		},
	};

	let submitStatus = null;
	let loadTimeout;

	function validate(which, event) {
		clearTimeout(loadTimeout);
		submitStatus = null;
		let res = formValidators[which](event);

		values[which] = event.value;
		errors[which] = res;
		valid[which] = res == null;
	}

	let editItem, editToggle;

	function itemModal(item) {
		editItem = item;
		if (item) {
			values.name = item.name;
			values.description = item.description;
			values.price = item.price;
			values.quantity = item.quantity;
		} else {
			Object.keys(values).forEach(k => (values[k] = null));
		}

		Object.keys(values).forEach(k =>
			validate(k, {type: 'focus', value: values[k]}),
		);
	}

	let resetTimeout;
	let imageUpload;
	let imageUploadDrag = false;

	$: {
		if (imageUpload && imageUpload[0]) {
			if (imageUpload[0].size > 5 * 1024 * 1024) {
				alert('Image must be less than 5MB');
				imageUpload = null;
			} else if (
				!['image/png', 'image/jpeg'].includes(imageUpload[0].type)
			) {
				alert('Image must be a PNG or JPEG');
				imageUpload = null;
			}
		}
	}
	async function manageItems(e) {
		e.preventDefault();
		if (hasError) return false;
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
					name: values.name,
					description: values.description || null,
					price: parseFloat(values.price),
					quantity: parseFloat(values.quantity) || null,
				}),
			},
		).catch(() => null);

		let json = res && res.ok ? await res.json() : null;

		let imageRes;
		if (imageUpload && imageUpload[0] && json) {
			imageRes = await fetch(
				`/api/store/${storeID}/item/${json._id}/image`,
				{
					method: 'PATCH',
					body: imageUpload[0],
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
			Object.keys(values).forEach(x => {
				values[x] = null;
				errors[x] = null;
				valid[x] = !formValidators[x]({
					value: '',
					type: 'blur',
				});
			});
			editToggle.checked = false;
			setTimeout(
				() =>
					toastContainer.toast(
						editItem ? 'Item updated' : 'Item created',
						'success',
					),
				300,
			);

			load();
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

		editToggle.checked = false;
		submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
		Object.keys(values).forEach(x => {
			values[x] = null;
			errors[x] = null;
			valid[x] = !formValidators[x]({
				value: '',
				type: 'blur',
			});
		});
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

		load();
	}
</script>

<!-- Content -->
<div class="flex flex-row flex-wrap justify-between items-center my-6">
	<a
		href={$url('.')}
		class="btn btn-primary inline-flex flex-col self-center my-4 w-auto mx-6"
	>
		Back to store list
	</a>
	{#if balance !== null}
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
	{#await getStore()}
		<Loading height="2rem" />
	{:then store}
		<h2 class="text-4xl font-bold mb-6">{store.name}</h2>
		{#if store.canManage}
			<label
				for="editmodal"
				class="btn btn-primary self-end mb-4 modal-button"
				on:click={() => itemModal()}>New Item</label
			>
		{/if}
		{#if error || !items || !items.items || items.docCount == 0}
			<h2 class="text-center">
				{#if error}
					An Error Occured
				{:else if loading && !items}
					<Loading height="2rem" />
				{:else}
					No Items
				{/if}
			</h2>
		{:else}
			<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{#each items.items as item}
					<div
						class="p-4 bg-base-200 shadow rounded-lg flex flex-col"
					>
						<div class="flex flex-row justify-between items-center">
							<p class="inline-flex text-3xl font-semibold">
								{item.name}
							</p>
							{#if store.canManage}
								<label
									for="editmodal"
									class="inline-flex btn btn-circle btn-ghost text-3xl modal-button"
									on:click={() => itemModal(item)}
									><span class="icon-edit" /></label
								>
							{/if}
						</div>
						<p
							class="text-2xl font-semibold {balance !== null &&
							balance < item.price
								? 'text-red-500'
								: ''}"
						>
							<span
								class="icon-currency mr-3"
							/>{item.price.toLocaleString([], {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</p>
						{#if item.description}
							<p class="text-xl mt-2 whitespace-pre-wrap">
								{item.description}
							</p>
						{/if}
						<p class="flex-grow" />
						{#key item.imageHash}
							{#if item.imageHash}
								<img
									class="store-item mt-6 object-contain max-h-80"
									src="/api/store/{storeID}/item/{item._id}/image.png"
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

		<div class="flex flex-wrap justify-center align-center pt-4">
			{#if items}
				<h2 class="text-center mb-2">
					Showing page {items.page} of {items.pageCount}
				</h2>
				<div class="flex-break" />
				<button
					on:click={() => load(currentPage - 1, 'previous', true)}
					class="btn btn-primary w-40 mx-2"
					disabled={loading || currentPage <= 1}
				>
					{#if loading == 'previous'}
						<Loading height="2rem" />
					{:else}
						Previous
					{/if}
				</button>
				<button
					on:click={() => load(currentPage + 1, 'next', true)}
					class="btn btn-primary w-40 mx-2"
					disabled={loading || currentPage >= items.pageCount}
				>
					{#if loading == 'next'}
						<Loading height="2rem" />
					{:else}
						Next
					{/if}
				</button>
			{:else}
				<button
					on:click={() => load(currentPage ?? 1, 'refresh')}
					class="btn btn-primary w-40 mx-2"
					disabled={loading}
				>
					{#if loading == 'refresh'}
						<Loading height="2rem" />
					{:else if error}
						Retry
					{:else}
						Refresh
					{/if}
				</button>
			{/if}
		</div>
	{:catch error}
		<h2>{error}</h2>
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
	{/await}
</div>

<input
	type="checkbox"
	id="editmodal"
	class="modal-toggle"
	bind:this={editToggle}
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
			<form on:submit={manageItems}>
				<Input
					label="Name"
					bind:this={inputs.name}
					bind:value={values.name}
					bind:error={errors.name}
					bind:valid={valid.name}
					on:validate={e => validate('name', e.detail)}
				/>
				<Input
					label="Description (optional)"
					type="textarea"
					bind:this={inputs.description}
					bind:value={values.description}
					bind:error={errors.description}
					bind:valid={valid.description}
					on:validate={e => validate('description', e.detail)}
				/>
				<Input
					label="Price"
					bind:this={inputs.price}
					bind:value={values.price}
					bind:error={errors.price}
					bind:valid={valid.price}
					on:validate={e => validate('price', e.detail)}
				/>
				<Input
					label="Quantity (optional)"
					bind:this={inputs.quantity}
					bind:value={values.quantity}
					bind:error={errors.quantity}
					bind:valid={valid.quantity}
					on:validate={e => validate('quantity', e.detail)}
				/>
				<label class="label" for="">
					Image (optional) - PNG or JPEG, max 5MB
				</label>
				<label
					for="fileinput"
					class="btn btn-primary relative cursor-pointer w-full"
					>{imageUploadDrag
						? 'Drop file to upload'
						: imageUpload && imageUpload[0]
						? imageUpload[0].name
						: 'Select a file or drag one here'}
					<input
						type="file"
						id="fileinput"
						class="absolute top-0 right-0 bottom-0 left-0 opacity-0 w-full h-full filedrop"
						bind:files={imageUpload}
						on:dragenter={() => (imageUploadDrag = true)}
						on:dragleave={() => (imageUploadDrag = false)}
						on:drop={() => (imageUploadDrag = false)}
						accept="image/png image/jpeg"
					/></label
				>
				<div class="divider" />
				<div class="flex items-center space-x-2 justify-end">
					<label
						for="editmodal"
						class="btn px-12"
						on:click={e =>
							!confirm('Are you sure?') && e.preventDefault()}
					>
						Close
					</label>
					<button
						on:click={manageItems}
						disabled={submitStatus || hasError}
						class="btn {submitStatus == 'ERROR'
							? 'btn-error'
							: 'btn-primary'} px-12 !pointer-events-auto disabled:cursor-not-allowed disabled:border-0"
						class:!bg-base-300={hasError && !submitStatus}
						class:hover:!bg-base-300={hasError && !submitStatus}
						class:btn-active={submitStatus}
						class:!text-primary-content={submitStatus}
					>
						{#if submitStatus == 'LOADING'}
							<div class="px-2">
								<Loading height="2rem" />
							</div>
						{:else if submitStatus == 'ERROR'}
							Error
						{:else}
							{editItem ? 'Edit' : 'Create'}
						{/if}
					</button>
				</div>
			</form>
		{/key}
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
