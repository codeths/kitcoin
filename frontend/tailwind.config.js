module.exports = {
	/* mode: 'jit',  this causes a problem where the css doesn't change until you reload in snowpack's dev mode */
	purge: ['index.html', './public/**/*.html', './src/**/*.{js,svelte}'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
