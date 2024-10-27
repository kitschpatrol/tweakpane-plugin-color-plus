import {parsePickerLayout, parseRecord} from '@tweakpane/core';

import {ColorPlusInputParams} from './plugin';

export function parseColorInputParams(
	params: Record<string, unknown>,
): ColorPlusInputParams | undefined {
	return parseRecord<ColorPlusInputParams>(params, (p) => ({
		expanded: p.optional.boolean,
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
	}));
}

export function getKeyScaleForColor(forAlpha: boolean): number {
	return forAlpha ? 0.1 : 1;
}
