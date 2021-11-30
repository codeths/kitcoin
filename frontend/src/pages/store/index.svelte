<script>
	import Header from '../../components/Header.svelte';
	import SetBodyStyle from '../../utils/SetBodyStyle.svelte';
	import Auth from '../../utils/Auth.svelte';
</script>

<!-- Head -->
<SetBodyStyle classString="bg-gray-200" />
<Auth />
<Header />

<!-- Content -->
<div class="m-8">
	<h1 class="text-4xl text-center">Welcome to the Kitcoin Store!!</h1>
</div>
