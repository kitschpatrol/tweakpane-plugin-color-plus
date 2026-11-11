import { defineConfig } from 'vitest/config'

export default defineConfig({
	// Core's Sass helpers use deprecated functions, so only report this package's warnings.
	css: { preprocessorOptions: { scss: { quietDeps: true } } },
	server: { open: '/demo/example/' },
	test: {
		coverage: {
			exclude: ['src/scratch.ts'],
			include: ['src/**/*.ts'],
			provider: 'v8',
			reporter: ['text', 'html'],
		},
		css: true,
		environment: 'happy-dom',
	},
})
