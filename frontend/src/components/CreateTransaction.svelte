<script>
	import StudentSearch from './StudentSearch.svelte';
	import Loading from './Loading.svelte';
	import Input from './Input.svelte';

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
			if (num % 1 !== 0) return 'Amount must be a whole number';
			if (num < 1) return 'Amount must be greater than 0';

			return null;
		},
		reason: e => {
			let v = e.value;
			return null;
		},
	};

	function validate(which, event) {
		let res = formValidators[which](event);

		values[which] = event.value;
		errors[which] = res;
		valid[which] = res == null;
	}

	let submitStatus = null;
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
				amount: parseInt(values.amount),
				reason: values.reason || null,
			}),
		}).catch(() => null);

		let end = new Date();
		let wait = 1500 - (end.getTime() - start.getTime());

		setTimeout(
			() => {
				submitStatus = res && res.ok ? 'SUCCESS' : 'ERROR';
				if (res.ok) {
					Object.keys(values).forEach(x => (values[x] = null));
				}
				setTimeout(() => {
					submitStatus = null;
				}, 3000);
			},
			wait > 0 ? wait : 0,
		);

		return false;
	}

	function btnColor(submitStatus) {
		if (submitStatus == 'LOADING') return 'bg-gray-500';
		if (submitStatus == 'SUCCESS') return 'bg-green-500';
		if (submitStatus == 'ERROR') return 'bg-red-500';
		return 'bg-blue-500';
	}
</script>

<form class="bg-white shadow-md rounded px-8 py-8" on:submit={send}>
	<StudentSearch
		bind:this={inputs.student}
		bind:value={values.student}
		bind:error={errors.student}
		bind:valid={valid.student}
		on:validate={e => validate('student', e.detail)}
	/>
	<Input
		label="Amount"
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
	<div class="flex items-center justify-between">
		<div
			role="button"
			tabindex="0"
			on:click={send}
			class="{hasError
				? 'cursor-not-allowed bg-gray-400 pointer-events-none'
				: `cursor-pointer ${btnColor(
						submitStatus,
				  )}`} transition-colors duration-300 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-32 h-10 flex items-center justify-center text-center"
		>
			{#if submitStatus == 'LOADING'}
				<Loading height="2rem" />
			{:else if submitStatus == 'SUCCESS'}
				Sent
			{:else if submitStatus == 'ERROR'}
				Error
			{:else}
				Send
			{/if}
		</div>
	</div>
</form>
