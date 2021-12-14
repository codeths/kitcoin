import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vite';
import {writeFileSync} from 'fs';

export default defineConfig({
	plugins: [
		svelte(),
		{
			writeBundle: (options, bundle) => {
				const [path] = Object.entries(bundle).find(
					([_, file]) => file.isEntry,
				);
				writeFileSync('build/main.js', `export * from "./${path}"`);
			},
		},
	],
	build: {
		outDir: 'build',
		sourcemap: true,
	},
});
