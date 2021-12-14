<script>
	import {createEventDispatcher, onMount} from 'svelte';
	const dispatch = createEventDispatcher();

	import StudentSearch from './StudentSearch.svelte';
	import Loading from './Loading.svelte';
	import Input from './Input.svelte';

	export let modal = false;
	export let balance = -1;

	let values = {
		student: null,
		amount: null,
		reason: null,
	};

	let errors = {
		student: null,
		amount: null,
		reason: null,
	};

	let valid = {
		student: false,
		amount: false,
		reason: true,
	};

	let inputs = {};

	let hasError = true;

	$: {
		hasError = Object.values(valid).some(v => !v);
	}

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
			if (balance !== -1 && balance < num)
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

	function validate(which, event) {
		clearTimeout(loadTimeout);
		submitStatus = null;
		let res = formValidators[which](event);

		values[which] = event.value;
		errors[which] = res;
		valid[which] = res == null;
	}

	async function send(e) {
		e.preventDefault();
		if (hasError) return false;
		let start = new Date();
		submitStatus = 'LOADING';
		const res = await fetch('/api/transactions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				user: values.student,
				amount: parseFloat(values.amount),
				reason: values.reason || null,
			}),
		}).catch(() => null);

		let end = new Date();
		let wait = 1500 - (end.getTime() - start.getTime());

		let resetTimeout;
		clearTimeout(loadTimeout);
		loadTimeout = setTimeout(
			() => {
				submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
				if (res.ok) {
					balance -= parseFloat(values.amount);
					dispatch('balance', balance);
					Object.keys(values).forEach(x => {
						values[x] = null;
						errors[x] = null;
						valid[x] = !formValidators[x]({
							value: '',
							type: 'blur',
						});
					});
				}
				if (modal && res && res.ok) {
					dispatch('close', res && res.ok);
				} else {
					clearTimeout(resetTimeout);
					resetTimeout = setTimeout(() => {
						submitStatus = null;
					}, 3000);
				}
			},
			wait > 0 ? wait : 0,
		);

		return false;
	}

	function btnColor(submitStatus) {
		if (submitStatus == 'SUCCESS' && !modal) return 'btn-success';
		if (submitStatus == 'ERROR') return 'btn-error';
		return 'btn-primary';
	}

	export let student = undefined;
	let query;

	if (student) {
		values.student = student.id;
		query = student.name;
		valid.student = true;
	}
</script>

<form on:submit={send}>
	<StudentSearch
		disabled={student ? true : false}
		{query}
		bind:this={inputs.student}
		bind:value={values.student}
		bind:error={errors.student}
		bind:valid={valid.student}
		on:validate={e => validate('student', e.detail)}
	/>
	<Input
		label="Amount"
		focus={modal}
		bind:this={inputs.amount}
		bind:value={values.amount}
		bind:error={errors.amount}
		bind:valid={valid.amount}
		on:validate={e => validate('amount', e.detail)}
	/>
	<Input
		label="Reason (Optional)"
		type="textarea"
		bind:this={inputs.reason}
		bind:value={values.reason}
		bind:error={errors.reason}
		bind:valid={valid.reason}
		on:validate={e => validate('reason', e.detail)}
	/>
	<div
		class="flex items-center space-x-2 {modal
			? 'justify-end'
			: 'justify-start mt-4'}"
	>
		{#if modal}
			<button on:click={() => dispatch('close')} class="btn px-12">
				Close
			</button>
		{/if}
		<button
			on:click={send}
			disabled={submitStatus || hasError}
			class="btn {btnColor(
				submitStatus,
			)} px-12 !pointer-events-auto disabled:cursor-not-allowed disabled:border-0"
			class:!bg-base-300={hasError && !submitStatus}
			class:hover:!bg-base-300={hasError && !submitStatus}
			class:btn-active={submitStatus}
			class:!text-primary-content={submitStatus}
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
</form>
