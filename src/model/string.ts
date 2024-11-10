import {mapRange} from '@tweakpane/core';
import {
	type ColorConstructor as ColorJsConstructor,
	parse as colorJsParse,
	serialize as colorJsSerialize,
} from 'colorjs.io/fn';

import {
	ColorFormat,
	ColorPlusObject,
	convert,
	CoordFormat,
	copyColorPlusObject,
	expandHex,
	getColorPlusObjectFromColorJsObject,
	hexHasAlpha,
	isStringFormat,
	StringFormat,
	toDecimalPrecision,
} from './shared';

export function stringToColor(
	value: unknown,
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalizedValue = legacyTweakpaneColorStringNormalization(value);

	const stringFormatInOut: Partial<StringFormat> = {};
	let colorJs: ColorJsConstructor | undefined;

	try {
		colorJs = colorJsParse(normalizedValue, {
			// @ts-expect-error - Type definition inconsistencies
			parseMeta: stringFormatInOut,
		});
	} catch {
		return undefined;
	}

	// Is stringFormatInOut ever actually undefined?
	const stringFormat =
		stringFormatInOut.formatId === undefined
			? undefined
			: (stringFormatInOut as StringFormat);

	if (stringFormat === undefined) {
		console.warn('Could not parse meta');
		return undefined;
	}

	if (
		stringFormat.format.alpha !== undefined &&
		typeof stringFormat.format.alpha !== 'boolean'
	) {
		console.warn('Alpha metadata is not boolean?');
		return undefined;
	}

	const hasAlpha =
		stringFormat.format.alpha ||
		stringFormat.alphaType !== undefined ||
		(stringFormat.formatId === 'hex' && hexHasAlpha(normalizedValue));

	// if (!validateColorJsObject(colorJs)) {
	// 	console.warn("Can't handle null coords");
	// 	return undefined;
	// }

	const color = getColorPlusObjectFromColorJsObject(colorJs);

	return {
		format: {
			type: 'string',
			format: stringFormat,
			alpha: hasAlpha,
			space: color.spaceId,
		},
		color: color,
	};
}

export function colorToString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	if (!isStringFormat(format.format)) {
		console.warn('Invalid format type');
		return undefined;
	}
	const stringFormat = format.format;

	// Converts if needed, rounds if needed, always returns a copy
	const convertedColor = toDecimalPrecisionForFormat(
		convert(color, format.space) ?? color,
		stringFormat,
		{
			number: 0,
			percentage: 1,
			unit: 2,
		},
	);

	// TODO Special case for keyword formats
	// if (format.format.formatId === 'keyword') {
	// 	// Round internal color to nearest keyword
	// }

	// Fancy format objects
	// See color.js/src/serialize.js
	console.log(stringFormat);

	const result = colorJsSerialize(convertedColor, {
		// inGamut: true, // TODO expose? Overrides inGamut in the format object
		commas: stringFormat.commas,

		// Precision is total significant digits, not decimal places, so stick with default
		// @ts-expect-error - Type definition inconsistencies
		alpha:
			// Erase alpha from output
			alphaOverride === false
				? false
				: // Hex can't take object, so return boolean
					stringFormat.formatId === 'hex'
					? (alphaOverride ?? format.alpha)
					: // Other formats need to know their original alpha format (e.g. <number> vs <percentage>)
						{
							include: alphaOverride ?? format.alpha,
							type: stringFormat.alphaType,
						},
		// @ts-expect-error - Type definition inconsistencies
		coords: stringFormat.types,
		// @ts-expect-error - Type definition inconsistencies
		format: stringFormat.format,
	});

	// Special case for hex to avoid #0f0-style truncation
	if (stringFormat.formatId === 'hex') {
		return expandHex(result);
	} else {
		return result;
	}
}

type DecimalPrecision = {
	/** Percentage values */
	percentage: number;
	/** Values between 0 and a larger integer, like 0-255 */
	number: number;
	/** Values between 0-1 */
	unit: number;
};

/**
 * Special case for RGB integer-style values
 * https://github.com/color-js/color.js/issues/203
 * Returns a new color object */
function toDecimalPrecisionForFormat(
	color: ColorPlusObject,
	stringFormat: StringFormat,
	precision: DecimalPrecision,
): ColorPlusObject {
	const newColor = copyColorPlusObject(color);

	if (stringFormat.types !== undefined) {
		for (let index = 0; index < newColor.coords.length; index++) {
			newColor.coords[index] = toDecimalPrecisionForCoordinate(
				newColor.coords[index],
				stringFormat,
				index,
				precision,
			);
		}
	}

	// Alpha always needs to be rounded
	console.log(stringFormat.alphaType);
	// if (stringFormat.alphaType === '<percentage>') {
	newColor.alpha = toDecimalPrecision(newColor.alpha, 2);
	// }

	return newColor;
}

function getCoordFormat(
	format: StringFormat,
	index: number,
): CoordFormat | undefined {
	if (!Array.isArray(format.format.coords[index])) {
		return format.format.coords[index];
	}

	const targetFormat = format.types[index].split('[')[0];
	return format.format.coords[index].find(
		(coordFormat) => coordFormat.type === targetFormat,
	);
}

function toDecimalPrecisionForCoordinate(
	value: number | null,
	format: StringFormat,
	index: number,
	precision: DecimalPrecision,
): number | null {
	if (value === null) {
		return value;
	}

	const coordFormat = getCoordFormat(format, index)!;
	if (coordFormat === undefined) {
		console.error('coordFormat undefined');
		return value;
	}
	const {range, coordRange} = coordFormat;
	if (range === undefined && coordRange === undefined) {
		console.error('Range and coordRange undefined');
		return value;
	}

	const isPercentage = format.types[index] === '<percentage>';

	if (range === undefined && coordRange !== undefined) {
		// Since range is undefined, there must be no difference between the formatted
		// value and internal value, so round directly
		return toDecimalPrecision(
			value,
			isPercentage
				? precision.percentage
				: coordRange[1] > 1
					? precision.number
					: precision.unit,
		);
	}

	if (range !== undefined && coordRange !== undefined) {
		// Convert to range, then round, then convert back to coord range
		const mappedValue = mapRange(
			value,
			coordRange[0],
			coordRange[1],
			range[0],
			range[1],
		);
		const roundedMappedValue = toDecimalPrecision(
			mappedValue,
			isPercentage
				? precision.percentage
				: range[1] > 1
					? precision.number
					: precision.unit,
		);
		return mapRange(
			roundedMappedValue,
			range[0],
			range[1],
			coordRange[0],
			coordRange[1],
		);
	}

	console.warn('Unreachable reached?');
	return value;
}

/**
 * Transforms the input string to expand supported import formats
 * - 0x-prefixed hex string support
 * - Legacy HSL compatibility: The built-in Tweakpane color input control accepts HSL strings without `%` units, e.g. `hsl(20, 15, 30)`, but color.js and the CSS standard do not.
 * @param value
 * @returns
 */
function legacyTweakpaneColorStringNormalization(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('0x')) {
		return trimmed.replace('0x', '#');
	}
	if (trimmed.startsWith('hsl')) {
		let index = 0;
		return trimmed.replace(/([\d.]+%?)/g, (match) => {
			if (index === 0 || match.includes('%') || index > 2) {
				index += 1;
				return match;
			} else {
				index += 1;
				return `${match}%`;
			}
		});
	}

	return trimmed;
}
