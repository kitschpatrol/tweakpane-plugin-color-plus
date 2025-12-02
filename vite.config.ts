import { defineConfig } from 'vitest/config'

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
