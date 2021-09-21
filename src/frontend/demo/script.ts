import {ITransaction} from '../../types';

(async () => {
	const me:
		| {
				name: string | null;
				email: string | null;
				id: string;
		  }
		| string = await fetch('/api/me')
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');
	if (typeof me == 'string')
		return (document.getElementById('me')!.innerHTML =
			me || 'Request failed');

	document.getElementById('my-name')!.innerHTML = me.name || 'No Name';
	document.getElementById('my-email')!.innerHTML = me.email || 'No Email';
	document.getElementById('my-id')!.innerHTML = me.id;
})();

document.getElementById('bal-btn')!.addEventListener('click', async () => {
	const id = (document.getElementById('bal-input')! as HTMLInputElement)
		.value;
	if (!id) return (document.getElementById('balance')!.innerHTML = '-');
	const bal: {balance: number} | string = await fetch(`/api/balance/${id}`)
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');
	if (typeof bal === 'string')
		return (document.getElementById('balance')!.innerHTML =
			bal || 'Request failed');
	document.getElementById('balance')!.innerHTML =
		bal.balance.toLocaleString();
});

document.getElementById('history-btn')!.addEventListener('click', async () => {
	const id = (document.getElementById('history-input')! as HTMLInputElement)
		.value;
	if (!id) return (document.getElementById('history-table')!.innerHTML = '');
	const transactions: ITransaction[] | string = await fetch(
		`/api/transactions/${id}`,
	)
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');
	if (typeof transactions == 'string')
		return (document.getElementById('history-table')!.innerHTML =
			transactions || 'Request failed');

	document.getElementById('history-table')!.innerHTML = '';

	if (transactions.length == 0)
		return (document.getElementById('history-table')!.innerHTML =
			'No transactions');
	transactions.forEach(transaction => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${new Date(transaction.date).toLocaleString()}</td>
			<td>${transaction.amount.toLocaleString()}</td>
			<td>${transaction.reason || 'None'}</td>
			<td>${transaction.owner}</td>
			<td>${transaction.balance.toLocaleString()}</td>
		`;
		document.getElementById('history-table')!.appendChild(row);
	});
});

document.getElementById('create-btn')!.addEventListener('click', async () => {
	let user = (document.getElementById('create-user')! as HTMLInputElement)
		.value;
	let amount: string | number = (
		document.getElementById('create-amount')! as HTMLInputElement
	).value;
	let reason = (document.getElementById('create-reason')! as HTMLInputElement)
		.value;

	if (!user) return alert('No user');
	if (!amount) return alert('No amount');
	if (typeof amount == 'string') {
		amount = parseInt(amount);
		if (!amount || isNaN(amount)) return alert('No amount');
	}
	const res = await fetch('/api/transactions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			user,
			amount,
			reason,
		}),
	})
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');
	if (typeof res == 'string') return alert(`Error: ${res}`);
	alert('OK.');
});

(async () => {
	const classes:
		| {
				name: string | null;
				section: string | null;
				id: string;
		  }[]
		| string = await fetch('/api/classes')
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');
	if (typeof classes == 'string')
		return (document.getElementById('class-list')!.innerHTML =
			classes || 'Request failed');

	if (classes.length == 0)
		return (document.getElementById('class-list')!.innerHTML =
			'No Classes');

	document.getElementById('class-list')!.innerHTML = '';

	classes.forEach(cls => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${cls.name || 'None'}</td>
			<td>${cls.section || 'None'}</td>
			<td>${cls.id}</td>
		`;
		document.getElementById('class-list')!.appendChild(row);
	});
})();

document.getElementById('student-btn')!.addEventListener('click', async () => {
	const id = (document.getElementById('student-input')! as HTMLInputElement)
		.value;
	if (!id) return (document.getElementById('student-list')!.innerHTML = '');
	const students:
		| {
				name: string | null;
				id: string;
		  }[]
		| string = await fetch(`/api/students/${id}`)
		.then(res => (res && res.ok ? res.json() : res.text()))
		.catch(() => 'Request failed');

	if (typeof students == 'string')
		return (document.getElementById('student-list')!.innerHTML =
			students || 'Request failed');

	document.getElementById('student-list')!.innerHTML = '';

	if (students.length == 0)
		return (document.getElementById('history-table')!.innerHTML =
			'No students');

	students
		.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
		.forEach(student => {
			const row = document.createElement('tr');
			row.innerHTML = `
			<td>${student.name || 'None'}</td>
			<td>${student.id}</td>
		`;
			document.getElementById('student-list')!.appendChild(row);
		});
});
