import {defineConfig, Terser} from 'vite';
import dts from 'vite-plugin-dts';
import sass from 'sass';
import postcss, {plugin} from 'postcss';
import autoprefixer from 'autoprefixer';

// Custom plugin to handle SASS compilation and injection
// function sassPlugin() {
// 	return {
// 		name: 'sass-plugin',
// 		async transform(code: any, id: string) {
// 			if (id.endsWith('plugin.scss')) {
// 				const sass = await import('sass');
// 				const postcss = await import('postcss');

// 				const css = sass
// 					.renderSync({
// 						file: 'src/sass/plugin.scss',
// 						outputStyle: 'compressed',
// 					})
// 					.css.toString();

// 				const result = await postcss.default([autoprefixer]).process(css, {
// 					from: undefined,
// 				});

// 				const processedCss = result.css.replace(/'/g, "\\'").trim();
// 				return {
// 					code: `export default '${processedCss}';`,
// 					map: null,
// 				};
// 			}
// 		},
// 	};
// }

// Custom plugin to replace __css__ placeholder
// function cssReplacementPlugin() {
// 	return {
// 		name: 'css-replacement',
// 		transform(code: string) {
// 			if (code.includes('__css__')) {
// 				return {
// 					code: code.replace(/__css__/g, '${cssContent}'),
// 					map: null,
// 				};
// 			}
// 		},
// 	};
// }

// Reimplements approach from https://github.com/tweakpane/plugin-template
function compileCssPlugin() {
	let cssString: string | undefined;

	return {
		name: 'compile-css',
		// Load CSS early in the process
		buildStart: async () => {
			const css = sass
				.renderSync({
					file: 'src/sass/plugin.scss',
					outputStyle: 'compressed',
				})
				.css.toString();

			const result = await postcss.default([autoprefixer]).process(css, {
				from: undefined,
			});

			cssString = result.css.trim();
		},
		// Replace __css__ in the code
		transform(code: string) {
			if (cssString !== undefined && code.includes('"__css__"')) {
				return code.replace('"__css__"', `'${cssString}'`);
			}
		},
	};
}

export default defineConfig(({mode}) => {
	const isProduction = mode === 'production';
	const distName = 'tweakpane-plugin-color-plus';
	const postfix = isProduction ? '.min' : '';

	return {
		build: {
			minify: false,
			exclude: ['@tweakpane/core'],
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: [
				{
					external: ['tweakpane', '@tweakpane/core'],
					input: 'src/index.ts',
					output: [
						{
							format: 'es',
							entryFileNames: `${distName}${postfix}.js`,
						},
					],
				},
				{
					external: ['tweakpane', '@tweakpane/core'],
					input: 'src/index.ts',
					output: [
						{
							format: 'es',
							entryFileNames: `${distName}.lite${postfix}.js`,
						},
					],
				},
			],
		},
		plugins: [
			dts({
				outDir: 'dist/types',
			}),
			compileCssPlugin(),
			// typescript({
			// 	tsconfig: 'src/tsconfig.json',
			// }),
			// sassPlugin(),
			// cssReplacementPlugin(),
		],
	};
});
