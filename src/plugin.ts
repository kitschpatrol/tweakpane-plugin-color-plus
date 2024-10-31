import {
	type ColorInputParams,
	createPlugin,
	type InputBindingPlugin,
	writePrimitive,
} from '@tweakpane/core';

import {ColorController} from './controller/color.js';
import {type ColorFormat, ColorPlus} from './model/color-plus.js';

export type ColorValueExternal = string; // only strings for now...
export interface ColorPlusInputParams extends ColorInputParams {
	format: ColorFormat;
}
//  {
// 	color?: {
// 		lockFormat: boolean;
// 		lockColorSpace: boolean;
// 	};
// }

export const ColorPlusInputPlugin: InputBindingPlugin<
	ColorPlus,
	ColorValueExternal,
	ColorPlusInputParams
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

		return {
			initialValue: color.serialize(format),
			params: {
				format,
			},
		};
	},
	binding: {
		// External to internal
		reader: () => {
			// Todo factor in args...
			return (value: unknown) => {
				// TODO recreate format?
				const newColor = ColorPlus.create(value);
				if (newColor === undefined) {
					throw new Error('Could not create color');
				}
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
				// TODO checks for format lock
				const parsedColor = ColorPlus.create(text);
				if (parsedColor === undefined) {
					return null;
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
