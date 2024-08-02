<script>
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {StudentSearch, Loading, Input, Form} from '.';

	export let modal = false;
	export let balance = -1;

	let formData = {
		isValid: false,
		values: {},
		errors: {},
	};
	let form;

	let fileUpload;
	let fileUploadInput;
	let fileUploadDrag = false;
	let isFirstUpload = true;

	const validMIMETypes = [
		'text/csv',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	];

	let formValidators = {
		students: e => {
			let v = e.value;
			if (!v || !v[0]) return isFirstUpload ? '' : 'Please select a file';
			isFirstUpload = false;
			if (!validMIMETypes.includes(v[0].type)) {
				fileUpload = [];
				return 'File must be a CSV or Excel document';
			}
			return null;
		},
		amount: e => {
			let v = e.value;
			if (!v) return e.type == 'blur' ? 'Amount is required' : '';
			if (!/^\d*(?:\.\d+)?$/.test(v.trim()))
				return 'Amount must be a number';
			let num = parseFloat(v.trim());
			if (isNaN(num)) return 'Amount must be an number';
			if (Math.round(num * 100) / 100 !== num)
				return 'Amount cannot have more than 2 decimal places';
			if (num <= 0) return 'Amount must be greater than 0';
			if (balance !== -1 && balance < num * numStudents)
				return 'You do not have enough money';

			return null;
		},
		reason: e => {
			let v = e.value;
			return null;
		},
		fromUser: e => {
			let v = e.value?.value;

			if (e.type)
				setTimeout(
					() =>
						form.validate({
							detail: {
								target: {
									name: 'fromText',
								},
								value: formData.values.fromText,
								type: '',
							},
						}),
					0,
				);

			let otherValue = formData.values.fromText;
			if (v && otherValue)
				return 'You cannot specify both a user and a message';

			if (!v && e.type == 'blur') {
				if (e.query) return 'User must be chosen from the dropdown';
				if (!otherValue)
					return 'You must specify either a user or a message';
			}
			if (!v && !otherValue) return '';
			return null;
		},
		fromText: e => {
			let v = e.value.trim();
			if (e.type)
				setTimeout(
					() =>
						form.validate({
							detail: {
								target: {
									name: 'fromUser',
								},
								value: formData.values.fromUser,
								type: '',
							},
						}),
					0,
				);

			let otherValue = formData.values.fromUser;
			if (v && otherValue)
				return 'You cannot specify both a user and a message';

			if (!v && !otherValue && e.type == 'blur')
				return 'You must specify either a user or a message';
			if (!v && !otherValue) return '';
			return null;
		},
	};

	$: {
		if (form)
			form.validate({
				detail: {
					type: '',
					target: fileUploadInput,
					value: fileUpload,
				},
			});
	}

	let submitStatus = null;
	let resetTimeout;

	async function send() {
		const formData = new FormData();
		formData.append('amount', form.values.amount);
		if (form.values.fromUser)
			formData.append('fromUser', form.values.fromUser.value);
		if (form.values.fromText.trim())
			formData.append('fromText', form.values.fromText);
		if (form.values.reason.trim())
			formData.append('reason', form.values.reason);
		formData.append('data', fileUpload[0]);

		submitStatus = 'LOADING';
		const res = await fetch('/api/transactions/bulk', {
			method: 'POST',
			body: formData,
		}).catch(() => null);

		submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
		clearTimeout(resetTimeout);
		resetTimeout = setTimeout(() => {
			submitStatus = null;
		}, 3000);
		if (res && res.ok) {
			let data = await res.json();
			if (form.reset) form.reset();
			fileUpload = [];
			isFirstUpload = true;
			dispatch('close', data.length);
		}

		return false;
	}

	function btnColor(submitStatus) {
		if (submitStatus == 'SUCCESS' && !modal)
			return 'btn-success btn-active !text-base-content';
		if (submitStatus == 'ERROR')
			return 'btn-error btn-active !text-base-content';
		return 'btn-primary';
	}
</script>

<Form
	on:submit={send}
	on:update={() =>
		Object.keys(formData).forEach(key => (formData[key] = form[key]))}
	bind:this={form}
	validators={formValidators}
>
	<label class="label" for="">
		Students - CSV or Excel document.<br />Supports ActivityScan exports.
	</label>
	<div class="flex w-full">
		<label for="fileinput" class="flex-1 btn btn-primary relative min-w-0">
			<span class="text-ellipsis whitespace-nowrap overflow-hidden">
				{fileUploadDrag
					? 'Drop file to upload'
					: fileUpload && fileUpload[0]
					? fileUpload[0].name
					: 'Select a file or drag one here'}
			</span>
			<input
				name="students"
				type="file"
				id="fileinput"
				class="absolute top-0 right-0 bottom-0 left-0 opacity-0 w-full h-full filedrop cursor-pointer disabled:cursor-not-allowed"
				bind:files={fileUpload}
				bind:this={fileUploadInput}
				on:dragenter={() => (fileUploadDrag = true)}
				on:dragleave={() => (fileUploadDrag = false)}
				on:drop={() => (fileUploadDrag = false)}
				accept={validMIMETypes.join(',')}
			/></label
		>
		{#if fileUpload && fileUpload[0]}
			<button
				type="button"
				class="btn btn-ghost text-3xl ml-2"
				on:click={() => (fileUpload = [])}
			>
				<span class="icon-close" />
			</button>
		{/if}
	</div>
	{#if formData.errors.students}
		<label class="label" for="">
			<span class="label-text-alt text-error">
				{formData.errors.students}
			</span>
		</label>
	{/if}
	<Input
		name="amount"
		label="Amount"
		bind:value={formData.values.amount}
		bind:error={formData.errors.amount}
		on:validate={form.validate}
	/>
	<Input
		name="reason"
		label="Reason (Optional)"
		type="textarea"
		bind:value={formData.values.reason}
		bind:error={formData.errors.reason}
		on:validate={form.validate}
	/>
	<label class="label" for="">
		<span class="label-text">From</span>
	</label>
	<StudentSearch
		name="fromUser"
		label="User"
		hidelabel="true"
		me="true"
		roles={null}
		bind:value={formData.values.fromUser}
		bind:error={formData.errors.fromUser}
		on:validate={form.validate}
	/>
	<div class="divider">OR</div>
	<Input
		name="fromText"
		label="Message"
		hidelabel="true"
		bind:value={formData.values.fromText}
		bind:error={formData.errors.fromText}
		on:validate={form.validate}
	/>
	<div
		class="flex items-center space-x-2 mt-4 {modal
			? 'justify-end'
			: 'justify-start'}"
	>
		{#if modal}
			<button
				type="button"
				on:click={() => dispatch('close')}
				class="btn btn-outline px-12"
			>
				Cancel
			</button>
		{/if}
		<button
			type="submit"
			disabled={submitStatus || !formData.isValid}
			class="btn {btnColor(submitStatus)} px-12 disabled:border-0"
		>
			{#if submitStatus == 'LOADING'}
				<div class="px-2">
					<Loading height="2rem" />
				</div>
			{:else if submitStatus == 'SUCCESS'}
				Sent
			{:else if submitStatus == 'ERROR'}
				Error
			{:else}
				Send
			{/if}
		</button>
	</div>
</Form>
