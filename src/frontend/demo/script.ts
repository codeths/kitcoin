(async () => {
	const me: {
		name: string | null;
		email: string | null;
		id: string;
	} | null = await fetch("/api/me").then(res => res && res.ok ? res.json() : null);
	if (!me) return document.getElementById('me')!.innerHTML = "Not logged in";

	document.getElementById('my-name')!.innerHTML = me.name || 'No Name';
	document.getElementById('my-email')!.innerHTML = me.email || 'No Email';
	document.getElementById('my-id')!.innerHTML = me.id;
})();