import {parsePickerLayout, parseRecord} from '@tweakpane/core';

import {ColorFormat} from './model/color-plus';
import {ColorPlusInputParams} from './plugin';

export function parseColorInputParams(
	params: Record<string, unknown>,
): ColorPlusInputParams | undefined {
	return parseRecord<ColorPlusInputParams>(params, (p) => ({
		format: p.required.custom(parseColorFormat),
		expanded: p.optional.boolean,
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
	}));
}

export function getKeyScaleForColor(forAlpha: boolean): number {
	return forAlpha ? 0.1 : 1;
}

export function parseColorFormat(value: unknown): ColorFormat | undefined {
	// TODO: validate format
	return value as ColorFormat;
}
