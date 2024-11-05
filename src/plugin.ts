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
import {parseColorInputParams, validateColorInputParams} from './util.js';

export type ColorValueExternal = string | number; // only strings for now...
export interface ColorPlusInputParams extends BaseInputParams {
	color?: {
		// In the original tweakpane installation, this is only applied to number values
		alpha?: boolean;
		// In the original tweakpane implementation, this only applied to object values
		type?: 'int' | 'float';
		// TODO sort of works
		formatLocked?: boolean;
	};
	expanded?: boolean;
	picker?: PickerLayout;
}

interface ColorPlusInputParamsInternal extends ColorPlusInputParams {
	format: ColorFormat;
	// Misuse parameters to prevent rounding-related jitter on pane.refresh()
	lastInternalValue: ColorPlus;
	lastExternalValue: ColorValueExternal;
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

		const parsedParams = parseColorInputParams(params);
		if (!parsedParams) {
			return null;
		}

		const validParams = validateColorInputParams(params, value);
		const initalValue = color.toValue(format, validParams.color?.alpha);

		return {
			initialValue: initalValue,
			params: {
				// Set some defaults...
				color: {
					alpha: parsedParams.color?.alpha, // Typically undefined
					type: parsedParams.color?.type ?? 'int',
					formatLocked: parsedParams.color?.formatLocked ?? true,
				},
				expanded: parsedParams.expanded,
				picker: parsedParams.picker,
				readonly: parsedParams.readonly,
				// Internal
				lastExternalValue: initalValue,
				lastInternalValue: color,
				format: format,
			},
		};
	},
	binding: {
		// External to internal
		reader: (args) => {
			// Todo factor in args...
			return (value: unknown) => {
				// TODO recreate format?
				const newColor = ColorPlus.create(value);
				if (newColor === undefined) {
					throw TpError.notBindable();
				}
				newColor.convert('hsv');

				// Reuse old HSV value if the new one doesn't change its
				// value representation... deals with having more precision
				// internally than externally
				const newExternalValue = newColor.toValue(
					args.params.format,
					args.params.color?.alpha,
				);

				if (args.params.lastExternalValue === newExternalValue) {
					return args.params.lastInternalValue;
				}

				return newColor;
			};
		},
		equals: (a, b) => {
			// require object identity equality as well
			const eq = a.equals(b) && a === b;
			return eq;
		},
		// Internal to external
		writer: (args) => {
			// Todo factor in args...
			return (target, inValue) => {
				args.params.lastInternalValue = inValue;
				args.params.lastExternalValue = inValue.toValue(
					args.params.format,
					args.params.color?.alpha,
				);

				writePrimitive(target, args.params.lastExternalValue);
			};
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) =>
				value.serialize(args.params.format, args.params.color?.alpha),
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

				parsedColor.convert('hsv');

				// Discard alpha if it wasn't present originally
				if (!(args.params.format.alpha || args.params.color?.alpha === true)) {
					parsedColor.alpha = 1;
				}

				return parsedColor;
			},
			colorType: args.params.color?.type ?? 'int',
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha:
				args.params.format.alpha || args.params.color?.alpha === true,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
