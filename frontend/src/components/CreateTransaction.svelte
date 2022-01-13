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
	let form = formData;
	let numStudents = 1;
	$: numStudents = (formData.values.student || '').split(' ').length;

	let formValidators = {
		student: e => {
			let v = e.value;
			if (!v)
				return e && e.type == 'blur'
					? e.query
						? 'Student must be selected from dropdown'
						: 'Student is required'
					: '';
			return null;
		},
		amount: e => {
			let v = e.value;
			if (!v) return e.type == 'blur' ? 'Amount is required' : '';
			let num = parseFloat(v);
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
	};

	let submitStatus = null;
	let loadTimeout;

	async function send() {
		let start = new Date();
		submitStatus = 'LOADING';
		const res = await fetch('/api/transactions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				user: formData.values.student.split(' '),
				amount: parseFloat(formData.values.amount),
				reason: formData.values.reason || null,
			}),
		}).catch(() => null);

		let end = new Date();
		let wait = 1500 - (end.getTime() - start.getTime());

		let resetTimeout;
		clearTimeout(loadTimeout);
		loadTimeout = setTimeout(
			() => {
				submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
				if (res && res.ok) {
					balance -= parseFloat(formData.values.amount) * numStudents;
					dispatch('balance', balance);
					if (form.reset) form.reset();
					dispatch('close', res && res.ok);
					if (!modal) {
						clearTimeout(resetTimeout);
						resetTimeout = setTimeout(() => {
							submitStatus = null;
						}, 3000);
					}
				}
			},
			wait > 0 ? wait : 0,
		);

		return false;
	}

	function btnColor(submitStatus) {
		if (submitStatus == 'SUCCESS' && !modal)
			return 'btn-success btn-active !text-base-content';
		if (submitStatus == 'ERROR')
			return 'btn-error btn-active !text-base-content';
		return 'btn-primary';
	}

	export let student = undefined;
	let query;

	if (student) {
		let array = student instanceof Map;
		if (array && array.size === 1) {
			student = Array.from(student.values())[0];
			array = false;
		}
		if (array) {
			formData.values.student = Array.from(student.keys()).join(' ');
			query = `${student.size} students`;
		} else {
			formData.values.student = student.id;
			query = student.name;
		}
		formData.errors.student = null;
	}
</script>

<Form
	on:submit={send}
	on:update={() =>
		Object.keys(formData).forEach(key => (formData[key] = form[key]))}
	bind:this={form}
	validators={formValidators}
>
	<StudentSearch
		name="student"
		disabled={student ? true : false}
		{query}
		bind:value={formData.values.student}
		bind:error={formData.errors.student}
		on:validate={form.validate}
	/>
	<Input
		name="amount"
		label="Amount"
		focus={modal}
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
	<div
		class="flex items-center space-x-2 {modal
			? 'justify-end'
			: 'justify-start mt-4'}"
	>
		{#if modal}
			<button
				type="button"
				on:click={() => dispatch('close')}
				class="btn px-12"
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
