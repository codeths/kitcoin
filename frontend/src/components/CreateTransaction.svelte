<script>
	import StudentSearch from './StudentSearch.svelte';

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
					v.type == 'blur' ? 'Student is required' : '');
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

	function send(e) {
		e.preventDefault();
		if (hasError) return false;
		fetch('/api/transactions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				user: values.student,
				amount: parseInt(values.amount),
				reason: values.reason || null,
			}),
		})
			.then(res => res.json())
			.then(res => {
				if (res.error) {
					alert(res.error);
				}
				alert('Success');
			});

		return false;
	}
</script>

<form class="bg-white shadow-md rounded px-8 py-8" on:submit={send}>
	<div class="mb-4">
		<label class="block text-gray-700 text-sm font-bold mb-2" for="student">
			Student
		</label>
		{#if formErrors.student}
			<span class="text-red-500">{formErrors.student}</span>
		{/if}
		<StudentSearch
			inputClass={formErrors.student ? 'border-red-500' : ''}
			on:change={e => validate('student', e)}
			on:blur={e => validate('student', e)}
			bind:value={values.student}
		/>
	</div>
	<div class="mb-4">
		<label class="block text-gray-700 text-sm font-bold mb-2" for="amount">
			Amount
		</label>
		{#if formErrors.amount}
			<span class="text-red-500">{formErrors.amount}</span>
		{/if}
		<input
			class="shadow appearance-none border {formErrors.amount
				? 'border-red-500'
				: ''} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="amount"
			type="number"
			placeholder="Amount"
			on:input={e => validate('amount', e)}
			on:blur={e => validate('amount', e)}
			bind:value={values.amount}
		/>
	</div>
	<div class="mb-4">
		<label class="block text-gray-700 text-sm font-bold mb-2" for="reason">
			Reason (optional)
		</label>
		{#if formErrors.reason}
			<span class="text-red-500">{formErrors.reason}</span>
		{/if}
		<textarea
			class="shadow appearance-none border {formErrors.reason
				? 'border-red-500'
				: ''} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			id="reason"
			type="text"
			placeholder="Reason"
			on:input={e => validate('reason', e)}
			on:blur={e => validate('reason', e)}
			bind:value={values.reason}
		/>
	</div>
	<div class="flex items-center justify-between">
		<input
			class="bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
			type="submit"
			value="Send"
			disabled={hasError}
		/>
	</div>
</form>
