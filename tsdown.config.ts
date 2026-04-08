/* eslint-disable e18e/prefer-static-regex */
// @case-police-ignore PostCSS

import Autoprefixer from 'autoprefixer'
import Postcss from 'postcss'
import * as Sass from 'sass'
import { defineConfig } from 'tsdown'
import Package from './package.json' with { type: 'json' }

function getDistributionName(packageName: string): string {
	// `@tweakpane/plugin-foobar` -> `tweakpane-plugin-foobar`
	// `tweakpane-plugin-foobar`  -> `tweakpane-plugin-foobar`
	return packageName
		.split(/[/@-]/)
		.filter((comp) => comp !== '')
		.join('-')
}

async function compileCss(): Promise<string> {
	const { css } = Sass.compile('src/sass/plugin.scss', {
		silenceDeprecations: ['global-builtin', 'color-functions', 'import'],
		style: 'compressed',
	})

	const result = await Postcss([Autoprefixer]).process(css, {
		from: undefined,
	})
	return result.css.replaceAll("'", String.raw`\'`).trim()
}

const distributionName = getDistributionName(Package.name)
const css = await compileCss()
const production = process.env.BUILD === 'production'
const postfix = production ? '.min' : ''

// Inline plugin to replace __css__ placeholder with compiled CSS
function cssReplacePlugin() {
	return {
		name: 'css-replace',
		transform(code: string) {
			if (code.includes('__css__')) {
				return { code: code.replaceAll('__css__', css) }
			}
		},
	}
}

export default defineConfig([
	// Build with external @tweakpane/core
	{
		alias: {
			'@tweakpane/core': './node_modules/@tweakpane/core/dist/index.js',
		},
		clean: false,
		deps: {
			neverBundle: ['tweakpane', '@tweakpane/core'],
			onlyBundle: ['colorjs.io'],
		},
		dts: false,
		entry: { [`${distributionName}.lite${postfix}`]: 'src/index.ts' },
		format: 'esm',
		minify: production,
		name: 'lite',
		outDir: 'dist',
		platform: 'browser',
		plugins: [cssReplacePlugin()],
		target: 'es2020',
		tsconfig: 'src/tsconfig.json',
	},
	// Build with bundled @tweakpane/core
	{
		clean: false,
		deps: {
			alwaysBundle: ['@tweakpane/core'],
			neverBundle: ['tweakpane'],
			onlyBundle: ['@tweakpane/core', 'colorjs.io'],
		},
		dts: false,
		entry: { [`${distributionName}${postfix}`]: 'src/index.ts' },
		format: 'esm',
		minify: production,
		name: 'bundled',
		outDir: 'dist',
		platform: 'browser',
		plugins: [cssReplacePlugin()],
		target: 'es2020',
		tsconfig: 'src/tsconfig.json',
	},
])
