import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: '../dist',
	},
	root: './demo/example',
	server: {
		open: '/index.html',
	},
	test: {
		root: './',
	},
})
