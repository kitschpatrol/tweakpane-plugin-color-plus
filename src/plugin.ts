import {
	type ColorInputParams,
	createPlugin,
	type InputBindingPlugin,
	writePrimitive,
} from '@tweakpane/core';

import {ColorController} from './controller/color.js';
import {ColorPlus} from './model/color-plus.js';

export type ColorValueExternal = string; // only strings for now...
export type ColorPlusInputParams = ColorInputParams;

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

		if (typeof value !== 'string') {
			console.warn(
				'ColorPlusInputPlugin only string values are supported for now',
			);
			return null;
		}

		const color = ColorPlus.create(value);

		if (color === undefined) {
			console.warn('ColorPlusInputPlugin could not parse string');
			return null;
		}

		return {
			initialValue: value as ColorValueExternal,
			params: {},
		};
	},
	binding: {
		// External to internal
		reader: () => {
			// Todo factor in args...
			return (value: unknown) => {
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
		writer: () => {
			// Todo factor in args...
			return (target, inValue) => {
				writePrimitive(target, inValue.toString());
			};
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) => value.serialize(),
			parser: (text: string) => {
				return ColorPlus.create(text) ?? null;
			},
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: true,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
