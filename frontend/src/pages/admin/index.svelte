<script>
	import {metatags} from '@roxi/routify';
	import {onMount} from 'svelte';
	import {
		StudentSearch,
		RoleSelect,
		ToastContainer,
		Form,
		Input,
		Loading,
	} from '../../components';
	let toastContainer;

	let selectedStudent = null;
	let studentSearch;
	let roleSelect;
	let submitStatus = null;

	metatags.title = 'Admin Home - Kitcoin';

	/**
	 * @todo
	 */
	async function manageUser() {}

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
				toastContainer.toast(
					`Loaded ${selectedStudent.text}.`,
					'success',
				);
				return;
			} catch (e) {}
		}

		selectedStudent = null;
		setData();
		toastContainer.toast(`Could not get user.`, 'error');
	}

	let defaultValues = {
		balance: '0' /** @todo fix balance not setting */,
		roles: ['STUDENT'],
	};

	// Manage items
	let manageFormData = {
		isValid: false,
		values: {},
		errors: {},
	};

	function setData(obj = {}) {
		let values = Object.assign(defaultValues, obj);

		roleSelect.setRoles(values.roles);
		values.roles = roleSelect.value;

		manageFormData.values = values;
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
				if (!/^[0-9]{5,6}$/.test(v)) return 'Invalid school ID';
			}
			return null;
		},
		balance: e => {
			let v = e.value;
			if (v) {
				if (!/^\d*(?:\.\d+)?$/.test(v.trim()))
					return 'Amount must be a number';
				let num = parseFloat(v.trim());
				if (isNaN(num)) return 'Amount must be an number';
				if (Math.round(num * 100) / 100 !== num)
					return 'Amount cannot have more than 2 decimal places';
			}
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
	};

	onMount(() => {
		setData();
	});
</script>

<!-- Content -->
<div class="mx-8 my-4">
	<div class="grid grid-cols-12">
		<div class="mx-2 my-4 col-span-12">
			<h1 class="text-3xl font-medium mb-2">Manage Users</h1>
			<div class="bg-base-100 shadow-md rounded px-8 py-8">
				<div class="flex items-center">
					<StudentSearch
						bind:value={selectedStudent}
						bind:this={studentSearch}
						on:change={setUser}
						hidelabel="true"
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
						value={manageFormData.values._id || 'New User'}
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
					<!-- @todo - make date component -->
					<Input
						name="balanceExpires"
						label="Balance Expires (optional)"
						bind:value={manageFormData.values.balanceExpires}
						bind:error={manageFormData.errors.balanceExpires}
						on:validate={manageForm.validate}
					/>
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
							{selectedStudent ? 'Done' : 'Create'}
						{/if}
					</button>
				</Form>
			</div>
		</div>
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
