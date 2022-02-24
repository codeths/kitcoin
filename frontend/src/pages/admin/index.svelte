<script>
	import {metatags} from '@roxi/routify';
	import {onMount, getContext} from 'svelte';
	import {
		StudentSearch,
		RoleSelect,
		ToastContainer,
		Form,
		Input,
		Loading,
		Transactions,
	} from '../../components';
	let toastContainer;

	let selectedStudent = null;
	let studentSearch;
	let roleSelect;
	let submitStatus = null;
	let resetTimeout;

	let formRefreshControl = {};

	metatags.title = 'Admin Home - Kitcoin';

	async function manageUser(e) {
		e.preventDefault();
		if (!manageFormData.isValid) return false;
		submitStatus = 'LOADING';
		let res = await fetch(
			selectedStudent
				? `/api/users/${selectedStudent.value}`
				: `/api/users`,
			{
				method: selectedStudent ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: manageFormData.values.name,
					googleID: manageFormData.values.googleID,
					email: manageFormData.values.email || null,
					schoolID: manageFormData.values.schoolID || null,
					balance: parseFloat(manageFormData.values.balance),
					balanceExpires: manageFormData.values.balanceExpires
						? new Date(
								manageFormData.values.balanceExpires,
						  ).toISOString()
						: null,
					weeklyBalanceMultiplier: manageFormData.values
						.weeklyBalanceMultiplier
						? parseFloat(
								manageFormData.values.weeklyBalanceMultiplier,
						  )
						: null,
					roles: manageFormData.values.roles.map(x => x.value),
					doNotSync: manageFormData.values.doNotSync,
				}),
			},
		).catch(() => null);

		if (res && res.ok) {
			submitStatus = 'SUCCESS';
			toastContainer.toast(
				selectedStudent ? 'User updated' : 'User created',
				'success',
			);
			setTimeout(() => {
				submitStatus = null;
			}, 3000);

			try {
				let json = await res.json();
				studentSearch.value = {text: json.name, value: json._id};
				studentSearch.query = json.name;
				setData(json);
			} catch (e) {}
		} else {
			clearTimeout(resetTimeout);
			submitStatus = 'ERROR';
			toastContainer.toast(
				`Failed to ${selectedStudent ? 'update' : 'create'} user`,
				'error',
			);
			resetTimeout = setTimeout(() => {
				submitStatus = null;
			}, 3000);
		}

		return false;
	}

	async function deleteUser() {
		if (
			!confirm(`Are you sure you want to delete ${selectedStudent.text}?`)
		)
			return;
		submitStatus = 'LOADING';

		let res = await fetch(`/api/users/${selectedStudent.value}`, {
			method: 'DELETE',
		}).catch(() => null);

		submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
		if (submitStatus == 'SUCCESS') {
			toastContainer.toast(`${selectedStudent.text} deleted`, 'success');
			studentSearch.el.setValue(null, null);
			setData();
		} else {
			toastContainer.toast('Error deleting user.', 'error');
		}
	}

	async function setUser() {
		if (!selectedStudent) {
			setData();
			return;
		}

		let res = await fetch(`/api/users/${selectedStudent.value}`).catch(
			() => null,
		);
		if (res && res.ok) {
			try {
				let data = await res.json();
				setData(data);
				toastContainer.toast(`Loaded user`, 'success');
				return;
			} catch (e) {}
		}

		studentSearch.el.setValue(null, null);
		setData();
		toastContainer.toast(`Could not get user`, 'error');
	}

	let defaultValues = {
		name: '',
		googleID: '',
		email: '',
		schoolID: '',
		balance: '0',
		balanceExpires: '',
		weeklyBalanceMultiplier: '',
		roles: ['STUDENT'],
		doNotSync: false,
	};

	// Manage items
	let manageFormData = {
		isValid: false,
		values: {},
		errors: {},
	};

	function setData(obj = {}) {
		let values = Object.assign({}, defaultValues, obj);

		if (values.balanceExpires) {
			// convert ISO string to local time
			let date = new Date(values.balanceExpires);
			let offset = new Date().getTimezoneOffset();
			let localISO = new Date(
				date.getTime() - offset * 60 * 1000,
			).toISOString();

			// format for datetime-local
			values.balanceExpires = localISO.slice(0, 19);
		}

		roleSelect.setRoles(values.roles);
		values.roles = roleSelect.value;

		manageFormData.values = values;

		formRefreshControl = {};
	}

	let manageForm;
	let manageValidators = {
		name: e => {
			let v = e.value;
			if (!v) return e && e.type == 'blur' ? 'Name is required' : '';
			return null;
		},
		googleID: e => {
			let v = e.value;
			if (!v) return e && e.type == 'blur' ? 'Google ID is required' : '';
			return null;
		},
		email: e => {
			let v = e.value;
			if (v) {
				// Stole from https://emailregex.com because there's no way I'm writing this myself
				if (
					!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
						v,
					)
				)
					return 'Invalid email address';
			}
			return null;
		},
		schoolID: e => {
			let v = e.value;
			if (v) {
				if (!/^\d{5,6}$/.test(v)) return 'Invalid school ID';
			}
			return null;
		},
		balance: e => {
			let v = e.value;
			if (!v) return e && e.type == 'blur' ? 'Balance is required' : '';
			if (!/^\d*(?:\.\d+)?$/.test(v.trim()))
				return 'Amount must be a number';
			let num = parseFloat(v.trim());
			if (isNaN(num)) return 'Amount must be an number';
			if (Math.round(num * 100) / 100 !== num)
				return 'Amount cannot have more than 2 decimal places';
			return null;
		},
		balanceExpires: e => {
			let v = e.value;
			if (v) {
				let date = new Date(v);
				if (isNaN(date.getTime())) return 'Invalid date';
			}
			return null;
		},
		weeklyBalanceMultiplier: e => {
			let v = e.value;
			if (v) {
				if (!/^\d*(?:\.\d+)?$/.test(v.trim()))
					return 'Weekly balance multiplier must be a number';
				let num = parseFloat(v.trim());
				if (isNaN(num))
					return 'Weekly balance multiplier must be an number';
				if (num < 0)
					return 'Weekly balance multiplier cannot be less than 0';
			}
			return null;
		},
		roles: e => {
			let v = e.value;
			return null;
		},
		doNotSync: e => {
			let v = e.value;
			return null;
		},
	};

	onMount(() => {
		setData();
	});

	let ctx = getContext('userInfo');
	let hasAdminScope = false;

	(async () => {
		let info = (await ctx) || null;
		if (
			info &&
			info.scopes.includes(
				'https://www.googleapis.com/auth/admin.directory.user.readonly',
			)
		)
			hasAdminScope = true;
	})();
</script>

<!-- Content -->
<div class="mx-8 my-4">
	<div class="grid grid-cols-12">
		<div class="mx-2 my-4 col-span-12 md:col-span-6">
			<h1 class="text-3xl font-medium mb-2">Manage Users</h1>
			<div class="bg-base-100 shadow-md rounded-lg px-8 py-8">
				<div class="flex items-center">
					<StudentSearch
						bind:value={selectedStudent}
						bind:this={studentSearch}
						on:change={setUser}
						hidelabel="true"
						me="true"
						roles={null}
					/>
					{#if selectedStudent}
						<button
							type="button"
							class="btn btn-ghost text-3xl ml-2"
							on:click={() => {
								studentSearch.el.setValue(null, null);
								setData();
							}}
						>
							<span class="icon-close" />
						</button>
					{/if}
				</div>
				<div class="divider" />
				{#key formRefreshControl}
					<Form
						on:submit={manageUser}
						on:update={() =>
							Object.keys(manageFormData).forEach(
								key => (manageFormData[key] = manageForm[key]),
							)}
						bind:this={manageForm}
						validators={manageValidators}
					>
						<Input
							disabled
							label="ID"
							value={selectedStudent?.value || 'New User'}
						/>
						<Input
							name="name"
							label="Name"
							bind:value={manageFormData.values.name}
							bind:error={manageFormData.errors.name}
							on:validate={manageForm.validate}
						/>
						<Input
							name="googleID"
							label="Google ID"
							bind:value={manageFormData.values.googleID}
							bind:error={manageFormData.errors.googleID}
							on:validate={manageForm.validate}
						/>
						<Input
							name="email"
							label="Email (optional)"
							bind:value={manageFormData.values.email}
							bind:error={manageFormData.errors.email}
							on:validate={manageForm.validate}
						/>
						<Input
							name="schoolID"
							label="School ID (optional)"
							bind:value={manageFormData.values.schoolID}
							bind:error={manageFormData.errors.schoolID}
							on:validate={manageForm.validate}
						/>
						<Input
							name="balance"
							label="Balance"
							bind:value={manageFormData.values.balance}
							bind:error={manageFormData.errors.balance}
							on:validate={manageForm.validate}
						/>
						<Input
							name="balanceExpires"
							label="Balance Expires (optional)"
							type="datetime-local"
							bind:value={manageFormData.values.balanceExpires}
							bind:error={manageFormData.errors.balanceExpires}
							on:validate={manageForm.validate}
							parentClass="flex items-middle"
						>
							<button
								slot="after-input"
								type="button"
								class="btn btn-ghost text-3xl ml-2"
								class:hidden={!manageFormData.values
									.balanceExpires}
								on:click={() => {
									manageFormData.values.balanceExpires = '';
								}}
							>
								<span class="icon-close" />
							</button>
						</Input>
						<Input
							name="weeklyBalanceMultiplier"
							label="Weekly Balance Multiplier (optional)"
							bind:value={manageFormData.values
								.weeklyBalanceMultiplier}
							bind:error={manageFormData.errors
								.weeklyBalanceMultiplier}
							on:validate={manageForm.validate}
						/>
						<RoleSelect
							name="roles"
							label="Roles"
							multiselect
							bind:this={roleSelect}
							bind:value={manageFormData.values.roles}
							bind:error={manageFormData.errors.roles}
							on:validate={manageForm.validate}
						/>
						<Input
							name="doNotSync"
							label="Do Not Sync with Google Admin"
							type="switch"
							bind:value={manageFormData.values.doNotSync}
							bind:error={manageFormData.errors.doNotSync}
							on:validate={manageForm.validate}
						/>
						<div class="flex items-center">
							<button
								type="submit"
								disabled={submitStatus == 'LOADING' ||
									!manageFormData.isValid}
								class="btn {submitStatus == 'ERROR'
									? 'btn-error'
									: 'btn-primary'} px-12 disabled:border-0 my-4"
							>
								{#if submitStatus == 'LOADING'}
									<div class="px-2">
										<Loading height="2rem" />
									</div>
								{:else if submitStatus == 'ERROR'}
									Error
								{:else}
									{selectedStudent ? 'Edit' : 'Create'}
								{/if}
							</button>
							{#if selectedStudent}
								<button
									type="button"
									class="btn btn-ghost text-3xl ml-2"
									on:click={deleteUser}
								>
									<span class="icon-delete" />
								</button>
							{/if}
						</div>
					</Form>
				{/key}
			</div>
		</div>
		<div class="mx-2 my-4 col-span-12 md:col-span-6">
			<h1 class="text-3xl font-medium mb-2">Manage Transactions</h1>
			<div class="bg-base-100 shadow-md rounded-lg px-8 py-8">
				{#key selectedStudent}
					{#if selectedStudent}
						<Transactions user={selectedStudent.value} />
					{:else}
						<p class="text-center text-xl">
							Select a user to view transactions
						</p>
					{/if}
				{/key}
			</div>
		</div>
		<div class="mx-2 my-4 col-span-12 md:col-span-6">
			<h1 class="text-3xl font-medium mb-2">Sync Users</h1>
			<div
				class="bg-base-100 shadow-md rounded-lg px-8 py-8 flex flex-col justify-center"
			>
				{#if hasAdminScope}
					<button
						class="btn btn-primary"
						on:click={() => {
							fetch('/api/users/sync', {
								method: 'POST',
							}).then(async x => {
								if (x.ok) {
									toastContainer.toast(
										'Sync started',
										'success',
									);
								} else {
									let text = await x.text();
									toastContainer.toast(
										text || `Error ${x.status}}`,
										'error',
									);
								}
							});
						}}
						target="_self">Sync</button
					>
				{:else}
					<span class="mb-2 text-center"
						>You have not authorized Kitcoin to access Google Admin.</span
					>
					<a
						class="btn btn-primary"
						href="/login/admin_sync"
						target="_self">Authorize Scope</a
					>
				{/if}
			</div>
		</div>
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
