import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vite';
import postcss from './postcss.config.js';

export default defineConfig({
	plugins: [svelte()],
	build: {
		outDir: 'build',
		sourcemap: true,
	},
	optimizeDeps: {
		exclude: ['@roxi/ssr', '@roxi/routify'],
	},
	css: {
		postcss,
	},
});
