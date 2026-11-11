import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const CORE_MODULE_PATH = /[/\\]node_modules[/\\]@tweakpane[/\\]core[/\\]/u
const COLOR_JS_MODULE = /^colorjs\.io(?:\/|$)/u

const shared: UserConfig = {
	css: {
		minify: true,
		preprocessorOptions: {
			// Sass resolves package partials such as core/lib/sass/_tp.scss here.
			// Core's helpers use deprecated Sass functions, so only report this package's warnings.
			scss: { loadPaths: ['node_modules'], quietDeps: true },
		},
		target: ['chrome107', 'firefox104', 'safari16'],
	},
	deps: {
		// Color.js is bundled into every build; only core differs between the bundled and lite builds.
		alwaysBundle: ['@tweakpane/core', COLOR_JS_MODULE],
		// Keep public types compatible with the consumer's installed core and Color.js.
		dts: { neverBundle: ['@tweakpane/core', 'tweakpane', COLOR_JS_MODULE] },
		neverBundle: ['tweakpane'],
		onlyBundle: ['@tweakpane/core', 'colorjs.io'],
	},
	dts: false,
	fixedExtension: false,
	format: 'esm',
	inputOptions: {
		treeshake: {
			// Core's unused plugin definitions do not register global state.
			moduleSideEffects(id) {
				return CORE_MODULE_PATH.test(id) ? false : undefined
			},
		},
	},
	outDir: 'dist',
	platform: 'browser',
	sourcemap: false,
	target: 'es2022',
	tsconfig: 'tsconfig.build.json',
}

const liteDependencies: UserConfig['deps'] = {
	alwaysBundle: [COLOR_JS_MODULE],
	neverBundle: ['@tweakpane/core', 'tweakpane'],
	onlyBundle: ['colorjs.io'],
}

export default defineConfig([
	// The build cleans dist once before building these in parallel.
	// Watch rebuilds remove only each configuration's own output files.
	{
		...shared,
		// Both checks run once on the packed package after all four builds finish.
		attw: { profile: 'esm-only' },
		dts: true,
		entry: { 'tweakpane-plugin-color-plus': 'src/index.ts' },
		name: 'bundled',
		publint: true,
	},
	{
		...shared,
		entry: { 'tweakpane-plugin-color-plus.min': 'src/index.ts' },
		minify: true,
		name: 'bundled-min',
	},
	{
		...shared,
		deps: liteDependencies,
		entry: { 'tweakpane-plugin-color-plus.lite': 'src/index.ts' },
		name: 'lite',
	},
	{
		...shared,
		deps: liteDependencies,
		entry: { 'tweakpane-plugin-color-plus.lite.min': 'src/index.ts' },
		minify: true,
		name: 'lite-min',
	},
])
