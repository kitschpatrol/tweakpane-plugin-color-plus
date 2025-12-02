import type { ColorConstructor as ColorJsConstructor } from 'colorjs.io/fn'
import { mapRange } from '@tweakpane/core'
import { parse as colorJsParse, serialize as colorJsSerialize } from 'colorjs.io/fn'
import type { ColorFormat, ColorPlusObject, CoordFormat, StringFormat } from './shared'
import {
	convert,
	copyColorPlusObject,
	expandHex,
	getColorPlusObjectFromColorJsObject,
	hexHasAlpha,
	isStringFormat,
	toDecimalPrecision,
} from './shared'

/**
 * Parses a CSS color string into a color object and format metadata
 */
export function stringToColor(
	value: unknown,
): undefined | { color: ColorPlusObject; format: ColorFormat } {
	if (typeof value !== 'string') {
		return undefined
	}

	const normalizedValue = legacyTweakpaneColorStringNormalization(value)

	const stringFormatInOut: Partial<StringFormat> = {}
	let colorJs: ColorJsConstructor | undefined

	try {
		colorJs = colorJsParse(normalizedValue, {
			// @ts-expect-error - Type definition inconsistencies
			parseMeta: stringFormatInOut,
		})
	} catch {
		return undefined
	}

	// Is stringFormatInOut ever actually undefined?
	const stringFormat =
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		stringFormatInOut.formatId === undefined ? undefined : (stringFormatInOut as StringFormat)

	if (stringFormat === undefined) {
		console.warn('Could not parse meta')
		return undefined
	}

	if (stringFormat.format.alpha !== undefined && typeof stringFormat.format.alpha !== 'boolean') {
		console.warn('Alpha metadata is not boolean?')
		return undefined
	}

	const hasAlpha =
		stringFormat.format.alpha === true ||
		stringFormat.alphaType !== undefined ||
		(stringFormat.formatId === 'hex' && hexHasAlpha(normalizedValue))

	// If (!validateColorJsObject(colorJs)) {
	// 	console.warn("Can't handle null coords");
	// 	return undefined;
	// }

	const color = getColorPlusObjectFromColorJsObject(colorJs)

	return {
		color,
		format: {
			alpha: hasAlpha,
			format: stringFormat,
			space: color.spaceId,
			type: 'string',
		},
	}
}

/**
 * Converts a color object into a CSS color string, using the provided format metadata
 */
export function colorToString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	if (!isStringFormat(format.format)) {
		console.warn('Invalid format type')
		return undefined
	}

	const stringFormat = format.format

	// Converts if needed, rounds if needed, always returns a copy
	const convertedColor = toDecimalPrecisionForFormat(
		convert(color, format.space) ?? color,
		stringFormat,
		{
			number: 0,
			percentage: 1,
			unit: 2,
		},
	)

	// TODO Special case for keyword formats
	// if (format.format.formatId === 'keyword') {
	// 	// Round internal color to nearest keyword
	// }

	// Fancy format objects
	// See color.js/src/serialize.js

	const result = colorJsSerialize(convertedColor, {
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
		// InGamut: true, // TODO expose? Overrides inGamut in the format object
		commas: stringFormat.commas,
		coords: stringFormat.types,
		// @ts-expect-error - Type definition inconsistencies
		format: stringFormat.format,
		// Precision is total significant digits, not decimal places, so stick with default?
		precision: 3,
	})

	// Special case for hex to avoid #0f0-style truncation
	if (stringFormat.formatId === 'hex') {
		return expandHex(result)
	}

	return result
}

type DecimalPrecision = {
	/** Values between 0 and a larger integer, like 0-255 */
	number: number
	/** Percentage values */
	percentage: number
	/** Values between 0-1 */
	unit: number
}

/**
 * Special case for RGB integer-style values
 * https://github.com/color-js/color.js/issues/203
 * Returns a new color object
 */
function toDecimalPrecisionForFormat(
	color: ColorPlusObject,
	stringFormat: StringFormat,
	precision: DecimalPrecision,
): ColorPlusObject {
	// Using this everywhere seems to result in some ugly rounding errors...
	// Skip for now unless color object is RGB...
	if (
		// eslint-disable-next-line de-morgan/no-negated-conjunction
		!(
			(stringFormat.formatId === 'rgb' || stringFormat.formatId === 'rgba') &&
			stringFormat.types.every((value) => value === '<number>[0,255]')
		)
	) {
		return color
	}

	const newColor = copyColorPlusObject(color)

	// eslint-disable-next-line ts/no-unnecessary-condition
	if (stringFormat.types !== undefined) {
		for (let index = 0; index < newColor.coords.length; index++) {
			newColor.coords[index] = toDecimalPrecisionForCoordinate(
				newColor.coords[index],
				stringFormat,
				index,
				precision,
			)
		}
	}

	// TODO
	// Alpha always needs to be rounded
	// console.log(stringFormat.alphaType);
	// if (stringFormat.alphaType == undefined) {
	// newColor.alpha = toDecimalPrecision(newColor.alpha, 2);
	// // }

	return newColor
}

function getCoordFormat(format: StringFormat, index: number): CoordFormat | undefined {
	if (!Array.isArray(format.format.coords[index])) {
		return format.format.coords[index]
	}

	const targetFormat = format.types[index].split('[')[0]
	return format.format.coords[index].find((coordFormat) => coordFormat.type === targetFormat)
}

function toDecimalPrecisionForCoordinate(
	value: null | number,
	format: StringFormat,
	index: number,
	precision: DecimalPrecision,
): null | number {
	if (value === null) {
		return value
	}

	const coordFormat = getCoordFormat(format, index)!
	// eslint-disable-next-line ts/no-unnecessary-condition
	if (coordFormat === undefined) {
		console.error('coordFormat undefined')
		return value
	}

	const { coordRange, range } = coordFormat
	if (range === undefined && coordRange === undefined) {
		// This happens with XYZ and other unbounded spaces... I think
		// just treat it as a unit value
		return toDecimalPrecision(value, precision.unit)
	}

	const isPercentage = format.types[index] === '<percentage>'

	if (range === undefined && coordRange !== undefined) {
		// Since range is undefined, there must be no difference between the formatted
		// value and internal value, so round directly
		return toDecimalPrecision(
			value,
			isPercentage ? precision.percentage : coordRange[1] > 1 ? precision.number : precision.unit,
		)
	}

	if (range !== undefined && coordRange !== undefined) {
		// Convert to range, then round, then convert back to coord range
		const mappedValue = mapRange(value, coordRange[0], coordRange[1], range[0], range[1])
		const roundedMappedValue = toDecimalPrecision(
			mappedValue,
			isPercentage ? precision.percentage : range[1] > 1 ? precision.number : precision.unit,
		)
		return mapRange(roundedMappedValue, range[0], range[1], coordRange[0], coordRange[1])
	}

	console.warn('Unreachable reached?')
	return value
}

/**
 * Transforms the input string to expand supported import formats
 * - 0x-prefixed hex string support
 * - Legacy HSL compatibility: The built-in Tweakpane color input control accepts HSL strings without `%` units, e.g. `hsl(20, 15, 30)`, but color.js and the CSS standard do not.
 */
function legacyTweakpaneColorStringNormalization(value: string): string {
	const trimmed = value.trim()
	if (trimmed.startsWith('0x')) {
		return trimmed.replace('0x', '#')
	}

	if (trimmed.startsWith('hsl')) {
		let index = 0
		// eslint-disable-next-line regexp/no-unused-capturing-group
		return trimmed.replaceAll(/([\d.]+%?)/g, (match) => {
			if (index === 0 || match.includes('%') || index > 2) {
				index += 1
				return match
			}

			index += 1
			return `${match}%`
		})
	}

	return trimmed
}
