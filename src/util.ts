import {parsePickerLayout, parseRecord} from '@tweakpane/core';

import {ColorFormat} from './model/color-plus';
import {ColorPlusInputParams} from './plugin';

type ColorType = 'float' | 'int';

export function parseColorInputParams(
	params: Record<string, unknown>,
): ColorPlusInputParams | undefined {
	return parseRecord<ColorPlusInputParams>(params, (p) => ({
		color: p.optional.object({
			// Legacy with modifications
			alpha: p.optional.custom(parseColorAlpha),
			// Legacy
			type: p.optional.custom(parseColorType),
			formatLocked: p.optional.boolean,
			wideGamut: p.optional.custom(parseColorWideGamut),
		}),
		expanded: p.optional.boolean,
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
	}));
}

// TODO Wut
export function getKeyScaleForColor(forAlpha: boolean): number {
	return forAlpha ? 0.1 : 1;
}

function parseColorWideGamut(
	value: unknown,
): 'always' | 'never' | 'auto' | undefined {
	return value === 'always'
		? 'always'
		: value === 'never'
			? 'never'
			: value === 'auto' || value === undefined
				? 'auto'
				: undefined;
}

function parseColorAlpha(
	value: unknown,
): 'always' | 'never' | 'auto' | undefined {
	return value === 'always' || value === true
		? 'always'
		: value === 'never' || value === false
			? 'never'
			: value === 'auto' || value === undefined
				? 'auto'
				: undefined;
}

function parseColorType(value: unknown): ColorType | undefined {
	return value === 'int' ? 'int' : value === 'float' ? 'float' : undefined;
}

export function parseColorFormat(value: unknown): ColorFormat | undefined {
	// TODO: validate format
	return value as ColorFormat;
}
