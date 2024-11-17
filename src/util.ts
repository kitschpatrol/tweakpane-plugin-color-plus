import {isObject, parsePickerLayout, parseRecord} from '@tweakpane/core';

import {ColorType} from './model/shared';
import {ColorPlusInputParams} from './plugin';

export function parseColorInputParams(
	params: Record<string, unknown>,
): ColorPlusInputParams | undefined {
	return parseRecord<ColorPlusInputParams>(params, (p) => ({
		color: p.optional.object({
			// Legacy, only applies to number values
			alpha: p.optional.boolean,
			// Legacy, only applies to object values?
			type: p.optional.custom(parseColorType),
			formatLocked: p.optional.boolean,
		}),
		expanded: p.optional.boolean,
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
	}));
}

// export function getKeyScaleForColor(forAlpha: boolean): number {
// 	return forAlpha ? 0.1 : 1;
// }

function parseColorType(value: unknown): ColorType | undefined {
	return value === 'int' ? 'int' : value === 'float' ? 'float' : undefined;
}

// export function parseColorFormat(value: unknown): ColorFormat | undefined {
// 	// TODO: validate format
// 	return value as ColorFormat;
// }

// export function alphaEnabled(
// 	format: ColorFormat,
// 	alphaMode: boolean | undefined,
// ): boolean {
// 	if (typeof alphaMode === 'boolean') {
// 		return alphaMode;
// 	}
// 	return format.alpha ?? false;
// }

export function validateColorInputParams(
	params: ColorPlusInputParams,
	colorValue: unknown,
): ColorPlusInputParams {
	if (params.color?.alpha !== undefined && typeof colorValue !== 'number') {
		console.warn(
			'ColorPlus: alpha mode is only supported for number values... ignoring',
		);
		params.color.alpha = undefined;
	}

	if (
		params.color?.type === 'float' &&
		!(isObject(colorValue) || Array.isArray(colorValue))
	) {
		console.warn(
			'ColorPlus: float mode is only supported for object or array values... ignoring',
		);
		params.color.type = 'int';
	}

	return params;
}
