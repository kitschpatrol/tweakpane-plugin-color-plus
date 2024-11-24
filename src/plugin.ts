import {
	type BaseInputParams,
	createPlugin,
	type InputBindingPlugin,
	type PickerLayout,
	writePrimitive,
} from '@tweakpane/core';

import {ColorController} from './controller/color.js';
import {ColorPlus} from './model/color-plus.js';
import {ColorFormat, formatIsSerializable} from './model/shared.js';
import {ColorTupleRgb, ColorTupleRgba} from './model/tuple.js';
import {parseColorInputParams, validateColorInputParams} from './util.js';

export type ColorValueExternal =
	| string
	| number
	| Record<string, number | null>
	| ColorTupleRgb
	| ColorTupleRgba; // only strings for now...
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

		const parsedParams = parseColorInputParams(params);
		if (!parsedParams) {
			return null;
		}

		const validParams = validateColorInputParams(params, value);

		const format = ColorPlus.getFormat(
			value,
			validParams.color?.alpha,
			parsedParams.color?.type,
		);

		if (format === undefined) {
			console.warn('ColorPlusInputPlugin could not parse and get format');
			return null;
		}

		if (!formatIsSerializable(format)) {
			console.warn('ColorPlusInputPlugin format not serializable');
			return null;
		}

		const color = ColorPlus.create(
			value,
			validParams.color?.alpha,
			parsedParams.color?.type,
		);
		if (color === undefined) {
			console.warn('ColorPlusInputPlugin could not parse');
			return null;
		}

		// TODO Use OKLCH as the internal representation for extended gamut?
		// color.convert('xyz-d65');
		color.convert('hsv');
		// color.toGamut('srgb');

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
				// Reuse old HSV value if the new one doesn't change its
				// value representation... deals with having more precision
				// internally than externally
				if (deepEquals(value, args.params.lastExternalValue)) {
					return args.params.lastInternalValue;
				}

				// Parse a new internal value from the external representation
				// TODO recreate format?
				const newColor = ColorPlus.create(
					value,
					args.params.color?.alpha,
					args.params.color?.type,
				);

				if (newColor === undefined) {
					console.log('ColorPlusInputPlugin could not parse, using last value');
					return args.params.lastInternalValue;
				}

				newColor.convert('hsv');

				// TODO necessary?
				// newColor.toGamut('srgb');
				return newColor;
			};
		},
		equals: (a, b) => {
			// require object identity equality as well
			const eq = a.equals(b) && a === b;
			// const eq = a.equals(b);
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

				if (
					typeof args.params.lastExternalValue === 'number' ||
					typeof args.params.lastExternalValue === 'string'
				) {
					writePrimitive(target, args.params.lastExternalValue);
				} else if (Array.isArray(args.params.lastExternalValue)) {
					for (
						let index = 0;
						index < args.params.lastExternalValue.length;
						index++
					) {
						// target.read()[index] = args.params.lastExternalValue[index];
						// target.writeProperty(
						// 	`${index}`,
						// 	args.params.lastExternalValue[index],
						// );
					}

					// Confirmed that this mutates the target array...
					// target.write(args.params.lastExternalValue);
				} else {
					for (const key of Object.keys(args.params.lastExternalValue)) {
						target.writeProperty(key, args.params.lastExternalValue[key]);
					}
				}
			};
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) =>
				value.serialize(args.params.format, args.params.color?.alpha),
			parser: (text: string) => {
				const parsedColor = ColorPlus.create(
					text,
					args.params.color?.alpha,
					args.params.color?.type,
				);
				if (parsedColor === undefined) {
					return null;
				}

				if (args.params.color?.formatLocked === false) {
					const newFormat = ColorPlus.getFormat(
						text,
						args.params.color?.alpha,
						args.params.color?.type,
					);
					if (newFormat === undefined) {
						return null;
					}
					args.params.format = newFormat;
				}

				parsedColor.convert('hsv');
				// parsedColor.toGamut('srgb');

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

// Optimized for shape of types we're going to see
function deepEquals(a: unknown, b: unknown): boolean {
	// Handle primitives and exact equality
	if (a === b) return true;

	// Handle arrays
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((val, i) => val === b[i]);
	}

	// Handle objects
	if (
		typeof a === 'object' &&
		a !== null &&
		typeof b === 'object' &&
		b !== null
	) {
		const keys = Object.keys(a as Record<string, unknown>);
		return (
			keys.length === Object.keys(b as Record<string, unknown>).length &&
			keys.every(
				(key) =>
					(a as Record<string, unknown>)[key] ===
					(b as Record<string, unknown>)[key],
			)
		);
	}

	return false;
}
