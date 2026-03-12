// @case-police-ignore Postcss, Typescript

/* eslint-disable ts/naming-convention */
/* eslint-disable import/no-named-as-default */

import type { LoggingFunction, Plugin, RollupLog } from 'rollup'
import Alias from '@rollup/plugin-alias'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import Replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import Typescript from '@rollup/plugin-typescript'
import Autoprefixer from 'autoprefixer'
import Postcss from 'postcss'
import Cleanup from 'rollup-plugin-cleanup'
import * as Sass from 'sass'
import Package from './package.json' with { type: 'json' }

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

function getPlugins(css: string, shouldMinify: boolean, includeAlias = true): Plugin[] {
	const plugins: Plugin[] = []

	if (includeAlias) {
		plugins.push(
			Alias({
				entries: [
					{
						find: '@tweakpane/core',
						replacement: './node_modules/@tweakpane/core/dist/index.js',
					},
				],
			}),
		)
	}

	plugins.push(
		Typescript({
			tsconfig: 'src/tsconfig.json',
		}),
		nodeResolve(),
		Replace({
			__css__: css,
			preventAssignment: false,
		}),
	)

	if (shouldMinify) {
		plugins.push(terser())
	}

	return [
		...plugins,
		// https://github.com/microsoft/tslib/issues/47
		Cleanup({
			comments: 'none',
		}),
	]
}

function getDistributionName(packageName: string): string {
	// `@tweakpane/plugin-foobar` -> `tweakpane-plugin-foobar`
	// `tweakpane-plugin-foobar`  -> `tweakpane-plugin-foobar`
	return packageName
		.split(/[/@-]/)
		.filter((comp) => comp !== '')
		.join('-')
}

// eslint-disable-next-line unicorn/no-anonymous-default-export
export default async () => {
	const production = process.env.BUILD === 'production'
	const postfix = production ? '.min' : ''

	const distributionName = getDistributionName(Package.name)
	const css = await compileCss()

	// Configuration shared between both builds
	const baseConfig = {
		input: 'src/index.ts',
		// Suppress `Circular dependency` warning
		onwarn(warning: RollupLog, rollupWarn: LoggingFunction) {
			if (warning.code === 'CIRCULAR_DEPENDENCY') {
				return
			}

			rollupWarn(warning)
		},
		plugins: getPlugins(css, production),
	}

	// Build with external @tweakpane/core
	const externalBuild = {
		...baseConfig,
		external: ['tweakpane', '@tweakpane/core'],
		output: {
			file: `dist/${distributionName}.lite${postfix}.js`,
			format: 'esm',
			globals: {
				tweakpane: 'Tweakpane',
			},
		},
	}

	// Build with bundled @tweakpane/core
	const bundledBuild = {
		...baseConfig,
		external: ['tweakpane'],
		output: {
			file: `dist/${distributionName}${postfix}.js`,
			format: 'esm',
			globals: {
				tweakpane: 'Tweakpane',
			},
		},
		plugins: getPlugins(css, production, false), // Don't include alias plugin for bundled build
	}

	return [externalBuild, bundledBuild]
}
