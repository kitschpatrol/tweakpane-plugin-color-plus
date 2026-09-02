import type { ColorFormat, ColorPlusObject, ColorType, TupleColorFormat } from './shared'
import { convert, formatNumber, roundToWhole } from './shared'

export type ColorTupleRgb = [null | number, null | number, null | number]
export type ColorTupleRgba = [null | number, null | number, null | number, number]

// Type guard to ensure array elements are number | null
function isColorTuple(value: unknown): value is ColorTupleRgb | ColorTupleRgba {
	if (!Array.isArray(value)) {
		return false
	}

	// Check length is either 3 (RGB) or 4 (RGBA)
	if (value.length !== 3 && value.length !== 4) {
		console.warn(`Invalid tuple length: ${value.length}`)
		return false
	}

	// Check first three values can be null or number
	const validRgb = value
		.slice(0, 3)
		.every((v): v is null | number => v === null || typeof v === 'number')

	if (!validRgb) {
		return false
	}

	// If length is 4, ensure alpha is a number (not null)
	if (value.length === 4) {
		return typeof value[3] === 'number'
	}

	return true
}

/**
 * Converts a tuple to a ColorPlusObject
 *
 * @param value Accepts arrays / tuples or tuple-like strings, e.g. `'[1, 2,
 *   3]'`
 * @param colorType The color type to convert to
 */
export function tupleToColor(
	value: unknown,
	colorType: ColorType,
):
	| undefined
	| {
			color: ColorPlusObject
			format: ColorFormat
	  } {
	// Handle tuple-like strings, too
	const tupleValue = typeof value === 'string' ? (parseTupleString(value) ?? value) : value

	// Ensure all values are numbers or null...
	if (!isColorTuple(tupleValue)) {
		console.warn('Invalid tuple values')
		return undefined
	}

	return {
		color: {
			alpha: tupleValue.length === 4 ? tupleValue[3] : 1,
			coords: [
				tupleValue[0] === null ? null : colorType === 'int' ? tupleValue[0] / 255 : tupleValue[0],
				tupleValue[1] === null ? null : colorType === 'int' ? tupleValue[1] / 255 : tupleValue[1],
				tupleValue[2] === null ? null : colorType === 'int' ? tupleValue[2] / 255 : tupleValue[2],
			],
			spaceId: 'srgb',
		},
		format: {
			alpha: tupleValue.length === 4,
			format: {
				colorType,
			},
			space: 'srgb',
			type: 'tuple',
		},
	}
}

/**
 * Converts a ColorPlusObject to a tuple
 */
export function colorToTuple(
	color: ColorPlusObject,
	format: TupleColorFormat,
	alphaOverride?: boolean,
): ColorTupleRgb | ColorTupleRgba {
	const { colorType } = format.format
	const convertedColor = convert(color, format.space) ?? color

	// Int channels are written as whole numbers, as the readme promises and the
	// text field already displays; float channels keep the model's precision
	const toChannel = (coord: null | number): null | number =>
		coord === null ? null : colorType === 'int' ? roundToWhole(coord * 255) : coord

	const result = [
		toChannel(convertedColor.coords[0]),
		toChannel(convertedColor.coords[1]),
		toChannel(convertedColor.coords[2]),
	]

	if (alphaOverride ?? format.alpha) {
		return [...result, convertedColor.alpha] as ColorTupleRgba
	}

	return result as ColorTupleRgb
}

/**
 * Converts a ColorPlusObject to a coordinate value string
 */
export function colorToTupleString(
	color: ColorPlusObject,
	format: TupleColorFormat,
	alphaOverride?: boolean,
): string {
	const tuple = colorToTuple(color, format, alphaOverride)
	const precision = format.format.colorType === 'int' ? 0 : 3
	const precisionAlpha = 3

	return stringifyTuple(tuple, precision, precisionAlpha)
}

function stringifyTuple(
	values: Array<null | number>,
	precision: number,
	precisionAlpha: number,
): string {
	return `[${values
		.map((value, index) =>
			value === null ? 'null' : formatNumber(value, index === 3 ? precisionAlpha : precision),
		)
		.join(', ')}]`
}

function parseTupleString(value: string): undefined | unknown[] {
	try {
		const { valueKey } = JSON.parse(`{"valueKey": ${value}}`) as { valueKey: unknown[] }
		return valueKey
	} catch {
		return undefined
	}
}
