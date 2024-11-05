import {
	type ColorConstructor as ColorJsConstructor,
	parse as colorJsParse,
	serialize as colorJsSerialize,
} from 'colorjs.io/fn';

import {
	ColorFormat,
	ColorPlusObject,
	convert,
	expandHex,
	getColorPlusObjectFromColorJsObject,
	hexHasAlpha,
	StringFormat,
} from './shared';

function isStringFormat(format: ColorFormat['format']): format is StringFormat {
	return (
		typeof format === 'object' &&
		format !== null &&
		'formatId' in format &&
		'format' in format &&
		typeof format.format === 'object' &&
		format.format !== null &&
		'type' in format.format &&
		typeof format.format.type === 'string'
	);
}

export function stringToColor(
	value: unknown,
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const hexNormalizedValue = value.replace('0x', '#');

	const stringFormatInOut: Partial<StringFormat> = {};
	let colorJs: ColorJsConstructor | undefined;

	try {
		colorJs = colorJsParse(hexNormalizedValue, {
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
		(stringFormat.formatId === 'hex' && hexHasAlpha(hexNormalizedValue));

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
	const convertedColor = convert(color, format.space) ?? color;

	if (!isStringFormat(format.format)) {
		console.warn('Invalid format type');
		return undefined;
	}
	const stringformat = format.format;

	// Fancy format objects
	// See color.js/src/serialize.js
	const result = colorJsSerialize(convertedColor, {
		inGamut: true, // TODO expose? Overrides inGamut in the format object
		commas: stringformat.commas,
		// precision: 4, // TODO expose?
		// @ts-expect-error - Type definition inconsistencies
		alpha:
			// Erase alpha from output
			alphaOverride === false
				? false
				: // Hex can't take object, so return boolean
					stringformat.formatId === 'hex'
					? (alphaOverride ?? format.alpha)
					: // Other formats need to know their original alpha format (e.g. <number> vs <percentage>)
						{
							include: alphaOverride ?? format.alpha,
							type: stringformat.alphaType,
						},
		// @ts-expect-error - Type definition inconsistencies
		coords: stringformat.types,
		// @ts-expect-error - Type definition inconsistencies
		format: stringformat.format,
	});

	// Special case for hex to avoid #0f0-style truncation
	if (stringformat.formatId === 'hex') {
		return expandHex(result);
	} else {
		return result;
	}
}
