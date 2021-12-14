import HMR from '@roxi/routify/hmr';
import App from './App.svelte';
import '../public/global.css';
var app = HMR(
	App,
	{
		target: document.body,
	},
	'app',
);

export default app;
