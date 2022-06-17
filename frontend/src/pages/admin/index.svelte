<script>
	import {metatags} from '@roxi/routify';
	import {onMount, getContext} from 'svelte';
	import Line from 'svelte-chartjs/src/Line.svelte';
	import Scatter from 'svelte-chartjs/src/Scatter.svelte';
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

	const views = ['Users', 'Sync', 'Analytics'];
	let activeView = 0; //Active view as an index of the array above

	function goToHashPage() {
		let hash = window.location.hash?.slice(1);
		if (hash) {
			let index = views.findIndex(
				x => x.toLowerCase() === hash.toLowerCase(),
			);
			if (index !== -1) goToPage(index);
		}
	}

	goToHashPage();
	window.addEventListener('hashchange', goToHashPage);

	function goToPage(index) {
		activeView = index;
		window.location.hash = index ? views[index].toLowerCase() : '';
	}

	let formRefreshControl = {};

	$: metatags.title = `Admin Home - ${views[activeView]} - Kitcoin`;

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
			) &&
			info.scopes.includes(
				'https://www.googleapis.com/auth/spreadsheets.readonly',
			)
		)
			hasAdminScope = true;
	})();

	function getDate(date = new Date()) {
		const offset = new Date(
			date.getTime() - date.getTimezoneOffset() * 60 * 1000,
		);
		return offset.toISOString().split('T')[0];
	}

	const TODAY = getDate();
	const DEFAULT_FROM = getDate(
		new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
	);
	let resultsNum = '10';
	let dateRange = {
		to: TODAY,
		from: DEFAULT_FROM,
	};
	let dateRangeValues = Object.assign({}, dateRange);
	let dateRangeText = '';
	let dateRangeActive = false;
	let dateRangeCSV = '';
	let dateRangeHint = `By default, different data points have different suggested ranges applied.
	To change these, check the "Active" box and input a new range.`;

	function dateRangeIsValid() {
		return (
			dateRangeValues.to == '' ||
			dateRangeValues.from == '' ||
			new Date(dateRangeValues.to).getTime() >=
				new Date(dateRangeValues.from).getTime()
		);
	}
	function updateRangeText() {
		dateRangeText =
			dateRange.to == dateRange.from
				? dateRange.to == TODAY
					? 'Today'
					: dateRange.to
				: `${dateRange.from} to ${
						dateRange.to == TODAY ? 'today' : dateRange.to
				  }`;
		if (!dateRangeValues.to) dateRangeValues.to = TODAY;
		if (!dateRangeValues.from) dateRangeValues.from = DEFAULT_FROM;
	}
	function applyRange(e) {
		dateRange = {
			to: dateRangeValues.to || TODAY,
			from: dateRangeValues.from || DEFAULT_FROM,
		};
		updateRangeText();
		if (dateRangeActive) updateReports();
		e.target.blur();
	}
	function getRangeParams(start) {
		return dateRangeActive
			? `${start || ''}to=${dateRange.to}T23:59:59&from=${
					dateRange.from
			  }T00:00:00`
			: '';
	}

	let transactionData;
	let purchaseData;
	let topSentData;
	let topTransactions = [];
	let topBalanceUsers = [];

	let chartOptions = {
		scales: {
			x: {
				title: {
					display: true,
					text: 'Date',
				},
			},
			y: {
				title: {
					display: true,
					text: 'Number of Kitcoin',
				},
			},
		},
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				displayColors: false,
			},
		},
	};
	let scatterOptions = {
		scales: {
			x: {
				title: {
					display: true,
					text: 'Total Kitcoin sent',
				},
				type: 'linear',
				suggestedMin: 0,
			},
			y: {
				title: {
					display: true,
					text: 'Times sent',
				},
				type: 'linear',
				suggestedMin: 0,
				ticks: {
					precision: 0,
				},
			},
		},
		elements: {
			point: {
				radius: 10,
				hoverRadius: 8,
			},
		},
		plugins: {
			legend: {
				onClick: null,
				labels: {
					boxWidth: 20,
				},
			},
			tooltip: {
				displayColors: false,
				callbacks: {
					label: ctx => {
						const [user, email, id] =
							ctx.dataset.labels[ctx.dataIndex];
						return [
							user,
							email,
							'ID: ' + id,
							'Times sent: ' + ctx.parsed.y.toLocaleString(),
							'Total Kitcoin sent: ' +
								ctx.parsed.x.toLocaleString([], {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}),
						];
					},
				},
			},
		},
	};

	async function getDailyTransactions(e) {
		let res = await fetch(
			`/api/reports/transactions/daily${getRangeParams('?')}`,
		);
		let data = await res.json();
		transactionData = {
			datasets: [
				{
					label: 'Kitcoin sent',
					borderColor: 'rgba(32, 102, 233, 0.5)',
					backgroundColor: 'rgba(32, 102, 233, 0.75)',
					data: data.map(data => ({
						x: new Date(data.date + 'T00:00:00').toLocaleDateString(
							[],
							{
								year: 'numeric',
								month: '2-digit',
								day: '2-digit',
							},
						),
						y: data.total,
					})),
				},
			],
		};

		if (e) toastContainer.toast('Refreshed daily transactions.', 'success');
	}

	async function getDailyPurchases(e) {
		let res = await fetch(
			`/api/reports/purchases/daily${getRangeParams('?')}`,
		);
		let data = await res.json();
		purchaseData = {
			datasets: [
				{
					label: 'Kitcoin spent (purchases)',
					borderColor: 'rgba(32, 102, 233, 0.5)',
					backgroundColor: 'rgba(32, 102, 233, 0.75)',
					data: data.map(data => ({
						x: new Date(data.date + 'T00:00:00').toLocaleDateString(
							[],
							{
								year: 'numeric',
								month: '2-digit',
								day: '2-digit',
							},
						),
						y: data.total,
					})),
				},
			],
		};

		if (e) toastContainer.toast('Refreshed daily purchases.', 'success');
	}

	async function getTopSent(e) {
		let res = await fetch(
			`/api/reports/sent/top?count=${resultsNum}${getRangeParams('&')}`,
		);
		let data = await res.json();
		topSentData = {
			datasets: [
				{
					label: 'User (hover for info)',
					labels: data.map(data => [
						data.name || 'Unknown User',
						data.email || '-',
						data._id,
					]),
					borderColor: 'rgba(32, 102, 233, 0.75)',
					backgroundColor: 'rgba(32, 102, 233, 0.5)',
					data: data.map(data => ({
						x: data.amount,
						y: data.count,
					})),
				},
			],
		};

		if (e) toastContainer.toast('Refreshed top Kitcoin sent.', 'success');
	}

	async function getTopBalance(e) {
		let res = await fetch(`/api/reports/balance/top?count=${resultsNum}`);
		topBalanceUsers = await res.json();

		if (e) toastContainer.toast('Refreshed top balances.', 'success');
	}

	async function getTopTransactions(e) {
		let res = await fetch(
			`/api/reports/transactions/top?count=${resultsNum}${getRangeParams(
				'&',
			)}`,
		);
		topTransactions = await res.json();

		if (e) toastContainer.toast('Refreshed top transactions.', 'success');
	}

	async function getBalance() {
		const res = await fetch(`/api/reports/balance/total`).catch(e => null);
		try {
			const json = await res.json();
			return json.balance;
		} catch (e) {
			throw 'An error occured.';
		}
	}

	let isInitialUpdate = true;
	function updateReports() {
		getDailyTransactions();
		getDailyPurchases();
		getTopSent();
		getTopBalance();
		getTopTransactions();

		dateRangeCSV = getRangeParams('&');

		isInitialUpdate
			? (isInitialUpdate = false)
			: toastContainer.toast('Refreshed reports.', 'success');
	}

	updateReports();
	updateRangeText();
</script>

<!-- Content -->
<div class="mx-8 my-4">
	<div class="flex justify-center">
		<div class="tabs tabs-boxed justify-center">
			{#each views as view, index}
				<button
					class="tab tab-lg transition-colors rounded-lg duration-300"
					class:tab-active={index == activeView}
					on:click={() => goToPage(index)}>{view}</button
				>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-12">
		<div
			class="mx-2 my-4 col-span-12 md:col-span-6 {activeView == 0
				? 'block'
				: 'hidden'}"
		>
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
		<div
			class="mx-2 my-4 col-span-12 md:col-span-6 {activeView == 0
				? 'block'
				: 'hidden'}"
		>
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
		<div
			class="mx-2 my-4 col-span-12 md:col-span-6 {activeView == 1
				? 'block'
				: 'hidden'}"
		>
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
						>You have not authorized Kitcoin to access Google Admin
						and/or Google Sheets.</span
					>
					<a
						class="btn btn-primary"
						href="/login/admin_sync"
						target="_self">Authorize Scope</a
					>
				{/if}
			</div>
		</div>
		<div
			class="mx-2 my-4 col-span-12 grid grid-cols-12 gap-4 {activeView ==
			2
				? 'block'
				: 'hidden'}"
		>
			{#key activeView}
				<div class="col-span-12 flex flex-wrap justify-between gap-y-2">
					<h1 class="text-3xl font-bold">Reports & Statistics</h1>
					<div class="flex gap-x-4 items-end flex-wrap">
						<div>
							<label class="label" for="">
								<div class="flex">
									<span class="label-text">Date range</span>
									<div
										class="flex ml-2 tooltip"
										data-tip={dateRangeHint}
									>
										<span
											class="icon-circle-question text-info text-xl leading-5"
										/>
									</div>
								</div>
								<span class="label-text pr-0.5">Active</span>
							</label>
							<div
								class="flex items-center input input-bordered divide-x divide-gray-300 dark:divide-gray-500"
							>
								<div class="dropdown dropdown-end">
									<label
										class="pr-2 flex items-center cursor-pointer"
										for=""
										tabindex="0"
									>
										<span class="text-sm"
											>{dateRangeText}</span
										>
										<span
											class="icon-calendar-range text-xl ml-3"
										/>
									</label>
									<ul
										tabindex="0"
										class="dropdown-content menu p-2 mt-4 shadow bg-base-100 rounded-box w-52"
									>
										<Input
											type="date"
											label="From"
											bind:value={dateRangeValues.from}
											error={dateRangeIsValid()
												? dateRangeValues.from == ''
													? false
													: null
												: `"From" can't be after "to"`}
											max={TODAY}
										/>
										<Input
											type="date"
											label="To"
											bind:value={dateRangeValues.to}
											error={dateRangeIsValid()
												? dateRangeValues.to == ''
													? false
													: null
												: `"To" can't be before "from"`}
											max={TODAY}
										/>
										<button
											class="btn btn-sm btn-primary mt-2"
											on:click={applyRange}
											disabled={!dateRangeIsValid()}
											>Apply date range</button
										>
									</ul>
								</div>
								<div class="pl-2 h-full flex items-center">
									<input
										type="checkbox"
										class="checkbox"
										bind:checked={dateRangeActive}
										on:change={updateReports}
									/>
								</div>
							</div>
						</div>
						<div>
							<Input
								type="select"
								label="# of entries shown"
								bind:value={resultsNum}
								on:change={e => (
									(resultsNum = e.target.value),
									updateReports()
								)}
							>
								<option>5</option>
								<option>10</option>
								<option>20</option>
								<option>50</option>
								<option>100</option>
							</Input>
						</div>
					</div>
				</div>

				<div class="col-span-12 lg:col-span-6">
					<h2
						class="col-span-12 text-xl font-bold flex justify-between items-center"
					>
						Kitcoin in circulation
					</h2>
					<div
						class="flex bg-base-100 shadow-md rounded-lg py-10 my-4 min-h-40 border-t-8 border-primary"
					>
						<h1
							class="text-center text-4xl sm:text-6xl lg:text-7xl xl:text-8xl flex justify-center items-center w-full h-full"
						>
							{#await getBalance()}
								<Loading height="2rem" />
							{:then balance}
								<span
									class="icon-currency mr-3"
								/>{balance.toLocaleString([], {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							{:catch error}
								{error}
							{/await}
						</h1>
					</div>
				</div>
				<div class="col-span-12 lg:col-span-6">
					<h2
						class="col-span-12 text-xl font-bold flex justify-between items-center"
					>
						All Transactions
					</h2>
					<div
						class="bg-base-100 shadow-md rounded-lg px-8 py-8 my-4 flex flex-col"
					>
						<a
							class="btn btn-primary"
							href="/api/reports/transactions/all?csv=true"
							target="_self"
						>
							<span class="icon-download text-2xl mr-2" />
							Download CSV
						</a>
					</div>
				</div>
				<div class="col-span-12 lg:col-span-6">
					<h2
						class="text-xl font-bold flex justify-between items-center"
					>
						<span>Kitcoin sent per day</span>
						<div class="flex">
							<button
								class="btn btn-ghost"
								on:click={getDailyTransactions}
							>
								<span class="icon-refresh text-2xl" />
							</button>
							<a
								class="btn btn-primary"
								href="/api/reports/transactions/daily?csv=true{dateRangeCSV}"
								target="_self"
							>
								<span class="icon-download text-2xl mr-2" />CSV
							</a>
						</div>
					</h2>
					<div class="bg-base-100 rounded-lg p-4 my-4">
						{#if transactionData}
							<Line
								data={transactionData}
								options={chartOptions}
							/>
						{:else}
							<Loading height="2rem" />
						{/if}
					</div>
				</div>
				<div class="col-span-12 lg:col-span-6">
					<h2
						class="text-xl font-bold flex justify-between items-center"
					>
						<span>Kitcoin spent per day (purchases)</span>
						<div class="flex">
							<button
								class="btn btn-ghost"
								on:click={getDailyPurchases}
							>
								<span class="icon-refresh text-2xl" />
							</button>
							<a
								class="btn btn-primary"
								href="/api/reports/purchases/daily?csv=true{dateRangeCSV}"
								target="_self"
							>
								<span class="icon-download text-2xl mr-2" />CSV
							</a>
						</div>
					</h2>
					<div class="bg-base-100 rounded-lg p-4 my-4">
						{#if purchaseData}
							<Line data={purchaseData} options={chartOptions} />
						{:else}
							<Loading height="2rem" />
						{/if}
					</div>
				</div>
				<div class="col-span-12 lg:col-span-6">
					<h2
						class="text-xl font-bold flex justify-between items-center"
					>
						<span>Top Kitcoin sent by staff</span>
						<div class="flex">
							<button class="btn btn-ghost" on:click={getTopSent}>
								<span class="icon-refresh text-2xl" />
							</button>
							<a
								class="btn btn-primary"
								href="/api/reports/sent/top?csv=true{dateRangeCSV}"
								target="_self"
							>
								<span class="icon-download text-2xl mr-2" />CSV
							</a>
						</div>
					</h2>
					<div class="bg-base-100 rounded-lg p-4 my-4">
						{#if topSentData}
							<Scatter
								data={topSentData}
								options={scatterOptions}
							/>
						{:else}
							<Loading height="2rem" />
						{/if}
					</div>
				</div>
				<div class="col-span-12">
					<h2
						class="text-xl font-medium flex justify-between items-center"
					>
						<span>Top Transactions</span>
						<div class="flex">
							<button
								class="btn btn-ghost"
								on:click={getTopTransactions}
							>
								<span class="icon-refresh text-2xl" />
							</button>
							<a
								class="btn btn-primary"
								href="/api/reports/transactions/top?csv=true{dateRangeCSV}"
								target="_self"
							>
								<span class="icon-download text-2xl mr-2" />CSV
							</a>
						</div>
					</h2>
					{#if topTransactions && topTransactions.length > 0}
						<div
							class="w-full bg-base-100 rounded-lg p-4 my-4 overflow-x-auto text-sm md:text-base"
						>
							<table class="w-full table-auto">
								<thead
									class="border-b border-gray-300 text-left"
								>
									<tr>
										<th class="px-2 py-4">Date</th>
										<th class="px-2 py-4">Transaction ID</th
										>
										<th class="px-2 py-4">From</th>
										<th class="px-2 py-4">Message</th>
										<th class="px-2 py-4">To</th>
										<th class="px-2 py-4">Amount</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-300">
									{#each topTransactions as transaction}
										<tr>
											<td class="px-2 py-4">
												{new Date(
													transaction.date,
												).toLocaleDateString()}
												{new Date(
													transaction.date,
												).toLocaleTimeString([], {
													hour: 'numeric',
													minute: '2-digit',
												})}
											</td>
											<td class="px-2 py-4 font-mono"
												>{transaction._id}</td
											>
											<td class="px-2 py-4"
												>{transaction.from.text ||
													'-'}</td
											>
											<td class="px-2 py-4"
												>{transaction.reason || '-'}</td
											>
											<td class="px-2 py-4"
												>{transaction.to.text ||
													'-'}</td
											>
											<td
												class="px-2 py-4"
												class:text-error={transaction.amount <
													0}
											>
												{#if transaction.amount < 0}
													<span>&minus;&nbsp;</span>
												{:else}
													<span>&ensp;&nbsp;</span>
												{/if}
												<span
													class="icon-currency mx-1"
												/>
												{Math.abs(
													transaction.amount,
												).toLocaleString([], {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p
							class="bg-base-100 rounded-lg p-4 my-4 text-center text-xl"
						>
							No transactions
						</p>
					{/if}
				</div>
				<div class="col-span-12">
					<h2
						class="text-xl font-medium flex justify-between items-center"
					>
						<span>Students with highest balance</span>
						<div class="flex">
							<button
								class="btn btn-ghost"
								on:click={getTopBalance}
							>
								<span class="icon-refresh text-2xl" />
							</button>
							<a
								class="btn btn-primary"
								href="/api/reports/balance/top?csv=true"
								target="_self"
							>
								<span class="icon-download text-2xl mr-2" />CSV
							</a>
						</div>
					</h2>
					{#if topBalanceUsers && topBalanceUsers.length > 0}
						<div
							class="w-full bg-base-100 rounded-lg p-4 my-4 overflow-x-auto text-sm md:text-base"
						>
							<table class="w-full table-auto">
								<thead
									class="border-b border-gray-300 text-left"
								>
									<tr>
										<th class="px-2 py-4">ID</th>
										<th class="px-2 py-4">Name</th>
										<th class="px-2 py-4">Email</th>
										<th class="px-2 py-4">Balance</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-300">
									{#each topBalanceUsers as user}
										<tr>
											<td class="px-2 py-4 font-mono"
												>{user._id}</td
											>
											<td class="px-2 py-4"
												>{user.name || '-'}</td
											>
											<td class="px-2 py-4"
												>{user.email || '-'}</td
											>
											<td class="px-2 py-4">
												<span>
													<span
														class="icon-currency mx-1"
													/>
													{Math.abs(
														user.balance,
													).toLocaleString([], {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p
							class="bg-base-100 rounded-lg p-4 my-4 text-center text-xl"
						>
							No users
						</p>
					{/if}
				</div>
			{/key}
		</div>
	</div>
</div>

<ToastContainer bind:this={toastContainer} />
