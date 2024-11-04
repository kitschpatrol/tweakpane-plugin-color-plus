/* eslint-env node */

import Alias from '@rollup/plugin-alias';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import Replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import Typescript from '@rollup/plugin-typescript';
import Autoprefixer from 'autoprefixer';
import fs from 'fs';
import Postcss from 'postcss';
import Cleanup from 'rollup-plugin-cleanup';
import * as Sass from 'sass';

const Package = JSON.parse(fs.readFileSync('./package.json'));

async function compileCss() {
	const css = Sass.renderSync({
		file: 'src/sass/plugin.scss',
		outputStyle: 'compressed',
	}).css.toString();

	const result = await Postcss([Autoprefixer]).process(css, {
		from: undefined,
	});
	return result.css.replace(/'/g, "\\'").trim();
}

function getPlugins(css, shouldMinify, includeAlias = true) {
	const plugins = [];

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
		);
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
	);

	if (shouldMinify) {
		plugins.push(terser());
	}

	return [
		...plugins,
		// https://github.com/microsoft/tslib/issues/47
		Cleanup({
			comments: 'none',
		}),
	];
}

function getDistName(packageName) {
	// `@tweakpane/plugin-foobar` -> `tweakpane-plugin-foobar`
	// `tweakpane-plugin-foobar`  -> `tweakpane-plugin-foobar`
	return packageName
		.split(/[@/-]/)
		.reduce((comps, comp) => (comp !== '' ? [...comps, comp] : comps), [])
		.join('-');
}

export default async () => {
	const production = process.env.BUILD === 'production';
	const postfix = production ? '.min' : '';

	const distName = getDistName(Package.name);
	const css = await compileCss();

	// Configuration shared between both builds
	const baseConfig = {
		input: 'src/index.ts',
		plugins: getPlugins(css, production),
		// Suppress `Circular dependency` warning
		onwarn(warning, rollupWarn) {
			if (warning.code === 'CIRCULAR_DEPENDENCY') {
				return;
			}
			rollupWarn(warning);
		},
	};

	// Build with external @tweakpane/core
	const externalBuild = {
		...baseConfig,
		external: ['tweakpane', '@tweakpane/core'],
		output: {
			file: `dist/${distName}.lite${postfix}.js`,
			format: 'esm',
			globals: {
				tweakpane: 'Tweakpane',
			},
		},
	};

	// Build with bundled @tweakpane/core
	const bundledBuild = {
		...baseConfig,
		external: ['tweakpane'],
		output: {
			file: `dist/${distName}${postfix}.js`,
			format: 'esm',
			globals: {
				tweakpane: 'Tweakpane',
			},
		},
		plugins: getPlugins(css, production, false), // Don't include alias plugin for bundled build
	};

	return [externalBuild, bundledBuild];
};
