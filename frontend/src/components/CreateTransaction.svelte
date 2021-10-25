<script>
	import StudentSearch from './StudentSearch.svelte';
	import Loading from './Loading.svelte';

	// string: error
	// null: no error
	// empty string: no input happened
	let formErrors = {
		student: '',
		amount: '',
		reason: null,
	};

	let values = {
		student: null,
		amount: null,
		reason: null,
	};

	let hasError = true;
	let checkError = () =>
		(hasError = Object.values(formErrors).some(x => x != null));

	let formValidators = {
		student: e => {
			let v = e.detail;
			if (!v)
				return (formErrors.student =
					e && e.type == 'blur' ? 'Student is required' : '');
			formErrors.student = null;
		},
		amount: e => {
			let v = e.target.value;
			if (!v) return (formErrors.amount = 'Amount is required');
			let num = parseFloat(v);
			if (isNaN(num))
				return (formErrors.amount = 'Amount must be an number');
			if (num % 1 !== 0)
				return (formErrors.amount = 'Amount must be a whole number');
			if (num < 1)
				return (formErrors.amount = 'Amount must be greater than 0');
			formErrors.amount = null;
		},
		reason: e => {
			let v = e.target.value;
			formErrors.reason = null;
		},
	};

	let validate = (which, event) => {
		formValidators[which](event);
		checkError();
	};

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

	function borderStyle(error) {
		if (error == null) return 'border-green-500';
		if (error) return 'border-red-500';
		return '';
	}

	function textStyle(error) {
		if (error) return 'text-red-500';
		return 'text-gray-700';
	}

	function btnColor(submitStatus) {
		if (submitStatus == 'LOADING') return 'bg-gray-500';
		if (submitStatus == 'SUCCESS') return 'bg-green-500';
		if (submitStatus == 'ERROR') return 'bg-red-500';
		return 'bg-blue-500';
	}
</script>

<form class="bg-white shadow-md rounded px-8 py-8" on:submit={send}>
	<div class="mb-4">
		<label
			class="block {textStyle(formErrors.student)} text-sm font-bold mb-2"
			for="student"
		>
			{formErrors.student || 'Student'}
		</label>
		<StudentSearch
			inputClass={borderStyle(formErrors.student)}
			on:change={e => validate('student', e)}
			on:blur={e => validate('student', e)}
			bind:value={values.student}
		/>
	</div>
	<div class="mb-4">
		<label
			class="block {textStyle(formErrors.amount)} text-sm font-bold mb-2"
			for="amount"
		>
			{formErrors.amount || 'Amount'}
		</label>
		<input
			class="shadow appearance-none border {borderStyle(
				formErrors.amount,
			)} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="amount"
			type="number"
			placeholder="Amount"
			on:input={e => validate('amount', e)}
			on:blur={e => validate('amount', e)}
			bind:value={values.amount}
		/>
	</div>
	<div class="mb-4">
		<label
			class="block {textStyle(formErrors.reason)} text-sm font-bold mb-2"
			for="reason"
		>
			{formErrors.reason || 'Reason (optional)'}
		</label>
		<textarea
			class="shadow appearance-none border {borderStyle(
				formErrors.reason,
			)} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="reason"
			type="text"
			placeholder="Reason"
			on:input={e => validate('reason', e)}
			on:blur={e => validate('reason', e)}
			bind:value={values.reason}
		/>
	</div>
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
