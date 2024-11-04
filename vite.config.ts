import {defineConfig} from 'vite';

export default defineConfig({
	root: './demo',
	build: {
		outDir: '../dist',
	},
	server: {
		open: '/index.html',
	},
});
