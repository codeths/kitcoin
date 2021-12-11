<script>
	import {metatags} from '@roxi/routify';
	import SetBodyStyle from '../utils/SetBodyStyle.svelte';

	metatags.title = 'Kitcoin';
</script>

<SetBodyStyle classString="bg-gray-200" />

<div class="m-8">
	<h1>Welcome to KitCoin!</h1>
	<br />
	<p>This is a placeholder page so there isn't a 404 when you go to /</p>
	<br />
	<p>
		Current pages (click to visit): <a href="/student">Student</a>|<a
			href="/staff">Staff</a
		>|<a href="/store">Store</a> (currently blank)
	</p>
</div>
