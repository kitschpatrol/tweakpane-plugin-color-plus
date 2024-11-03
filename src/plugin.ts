import {
	type BaseInputParams,
	createPlugin,
	type InputBindingPlugin,
	type PickerLayout,
	TpError,
	writePrimitive,
} from '@tweakpane/core';

import {ColorController} from './controller/color.js';
import {type ColorFormat, ColorPlus} from './model/color-plus.js';
import {parseColorInputParams} from './util.js';

export type ColorValueExternal = string; // only strings for now...
export interface ColorPlusInputParams extends BaseInputParams {
	color?: {
		// Boolean is legacy... true is always, false is never
		alpha?: boolean | 'always' | 'never' | 'auto';
		type?: 'int' | 'float';
		formatLocked?: boolean;
		wideGamut?: 'always' | 'never' | 'auto';
	};
	expanded?: boolean;
	picker?: PickerLayout;
}

interface ColorPlusInputParamsInternal extends ColorPlusInputParams {
	format: ColorFormat;
}

export const ColorPlusInputPlugin: InputBindingPlugin<
	ColorPlus,
	ColorValueExternal,
	ColorPlusInputParamsInternal
> = createPlugin({
	id: 'input-color-plus',
	type: 'input',
	accept(value, params) {
		if (params.view !== 'color-plus') {
			return null;
		}

		const format = ColorPlus.getFormat(value);

		if (format === undefined) {
			console.warn('ColorPlusInputPlugin could not parse and get format');
			return null;
		}

		const color = ColorPlus.create(value);
		if (color === undefined) {
			console.warn('ColorPlusInputPlugin could not parse');
			return null;
		}

		// TODO Use OKLCH as the internal representation for extended gamut?
		color.convert('hsv');

		const result = parseColorInputParams(params);

		console.log('----------------------------------');
		console.log(result);
		const resolvedResult = result
			? {
					initialValue: color.serialize(format),
					params: {
						color: {
							alpha: result.color?.alpha ?? 'auto',
							type: result.color?.type ?? 'int',
							formatLocked: result.color?.formatLocked ?? true,
							wideGamut: result.color?.wideGamut ?? 'auto',
						},
						format: format,
					},
				}
			: null;

		console.log(resolvedResult);
		return resolvedResult;
	},
	binding: {
		// External to internal
		reader: () => {
			// Todo factor in args...
			return (value: unknown) => {
				// TODO recreate format?
				const newColor = ColorPlus.create(value);
				if (newColor === undefined) {
					throw TpError.notBindable();
				}
				newColor.convert('hsv');
				return newColor;
			};
		},
		equals: (a, b) => {
			return a.equals(b);
		},
		// Internal to external
		writer: (args) => {
			// Todo factor in args...
			return (target, inValue) => {
				writePrimitive(target, inValue.serialize(args.params.format));
			};
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) => value.serialize(args.params.format),
			parser: (text: string) => {
				const parsedColor = ColorPlus.create(text);
				if (parsedColor === undefined) {
					return null;
				}

				if (args.params.color?.formatLocked === false) {
					const newFormat = ColorPlus.getFormat(text);
					if (newFormat === undefined) {
						return null;
					}
					args.params.format = newFormat;
				}

				return parsedColor;
			},
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: true,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
