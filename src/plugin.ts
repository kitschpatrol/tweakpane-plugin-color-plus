import {
	type BaseInputParams,
	createPlugin,
	type InputBindingPlugin,
	type PickerLayout,
	TpError,
	writePrimitive,
} from '@tweakpane/core';

import {ColorController} from './controller/color.js';
import {AlphaMode, type ColorFormat, ColorPlus} from './model/color-plus.js';
import {
	alphaEnabled,
	legacyAlphaModeToAlphaMode,
	parseColorInputParams,
} from './util.js';

export type ColorValueExternal = string | number; // only strings for now...
export interface ColorPlusInputParams extends BaseInputParams {
	color?: {
		// Boolean is legacy... true is always, false is never
		// In the original tweakpane installation, this only applied to number values
		alpha?: boolean | AlphaMode;
		// In the original tweakpane implementation, this only applied to object values
		type?: 'int' | 'float';
		// TODO sort of works
		formatLocked?: boolean;
		// TODO
		wideGamut?: 'always' | 'never' | 'auto';
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

		const result = parseColorInputParams(params);

		if (!result) {
			return null;
		}

		const initalValue = color.toValue(
			format,
			legacyAlphaModeToAlphaMode(result.color?.alpha),
		);

		return {
			initialValue: initalValue,
			params: {
				// Set some defaults...
				color: {
					alpha: legacyAlphaModeToAlphaMode(result.color?.alpha),
					type: result.color?.type ?? 'int',
					formatLocked: result.color?.formatLocked ?? true,
					wideGamut: result.color?.wideGamut ?? 'auto',
				},
				lastExternalValue: initalValue,
				lastInternalValue: color,
				format: format,
				expanded: result.expanded,
				picker: result.picker,
				readonly: result.readonly,
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
					legacyAlphaModeToAlphaMode(args.params.color?.alpha),
				);

				if (args.params.lastExternalValue === newExternalValue) {
					return args.params.lastInternalValue;
				}

				return newColor;
			};
		},
		equals: (a, b) => {
			const eq = a.equals(b);
			return eq;
		},
		// Internal to external
		writer: (args) => {
			// Todo factor in args...
			return (target, inValue) => {
				args.params.lastInternalValue = inValue;
				args.params.lastExternalValue = inValue.toValue(
					args.params.format,
					legacyAlphaModeToAlphaMode(args.params.color?.alpha),
				);

				writePrimitive(target, args.params.lastExternalValue);
			};
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) =>
				value.serialize(
					args.params.format,
					legacyAlphaModeToAlphaMode(args.params.color?.alpha),
				),
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
				return parsedColor;
			},
			colorType: args.params.color?.type ?? 'int',
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: alphaEnabled(args.params.format, args.params.color?.alpha), // args.params.format.alpha ?? false,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
