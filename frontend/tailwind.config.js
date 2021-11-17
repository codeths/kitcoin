module.exports = {
	/* mode: 'jit',  this causes a problem where the css doesn't change until you reload in snowpack's dev mode */
	purge: {
		content: ['index.html', './public/**/*.html', './src/**/*.{js,svelte}'],
		options: {
			safelist: ['opacity-40', 'border-b-4'], // If you add a class but it never shows up in the build, add it here
		},
	},
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {
			colors: {
				'blue-eths': '#0d2240',
				'orange-eths': '#e24301',
			},
		},
	},
	variants: {
		extend: {
			backgroundColor: ['disabled'],
			cursor: ['disabled'],
		},
	},
	plugins: [],
};
