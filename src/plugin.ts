import {
	type ColorInputParams,
	createPlugin,
	type InputBindingPlugin,
	writePrimitive,
} from '@tweakpane/core';
import Color from 'colorjs.io';

import {ColorController} from './controller/color.js';

export type ColorValueInternal = Color;
export type ColorValueExternal = string; // only strings for now...
export type ColorPlusInputParams = ColorInputParams;

export const ColorPlusInputPlugin: InputBindingPlugin<
	ColorValueInternal,
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

		try {
			new Color(value);
			console.log('ColorPlusInputPlugin can parse string');
			// Return the parsed color
			return {
				initialValue: value as ColorValueExternal,
				params: {},
			};
		} catch {
			console.warn('ColorPlusInputPlugin could not parse string');
			return null;
		}
	},
	binding: {
		// External to internal
		reader: () => {
			// Todo factor in args...
			return (value: unknown) => {
				if (typeof value !== 'string') {
					throw new Error('ColorPlusInputPlugin reader only supports strings');
				}
				return new Color(value);
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
			formatter: (value: Color) => value.toString(),
			parser: (text: string) => new Color(text),
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: true,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
