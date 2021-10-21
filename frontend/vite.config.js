import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vite';
//import preprocess from 'svelte-preprocess';  //This isn't needed here

export default defineConfig({
	plugins: [svelte()],
	build: {
		outDir: 'build',
	},
	optimizeDeps: {
		exclude: ['@roxi/ssr'],
	},
});
