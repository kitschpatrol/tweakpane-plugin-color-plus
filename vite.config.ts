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
		coverage: {
			exclude: ['src/scratch.ts'],
			include: ['src/**/*.ts'],
			provider: 'v8',
			reporter: ['text', 'html'],
		},
		root: './',
	},
})
