module.exports = {
	/* mode: 'jit',  this causes a problem where the css doesn't change until you reload in snowpack's dev mode */
	purge: ['index.html', './public/**/*.html', './src/**/*.{js,svelte}'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
		colors: {
			white: '#ffffff',
			black: '#000000',
			transparent: 'transparent',
			currentColor: 'currentColor',
			'blue-eths': '#0d2240',
			'orange-eths': '#e24301',
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
