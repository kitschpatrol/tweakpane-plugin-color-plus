import {defineConfig} from 'vite';

export default defineConfig({
	root: './demo/example',
	build: {
		outDir: '../dist',
	},
	server: {
		open: '/index.html',
	},
	test: {
		root: './',
	},
});
