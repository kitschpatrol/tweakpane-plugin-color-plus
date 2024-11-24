import {
	type ColorFormat,
	type ColorPlusObject,
	type ColorType,
	convert,
	formatNumber,
	type TupleFormat,
} from './shared'

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
 * @param value Accepts arrays / tuples or tuple-like strings, e.g. `'[1, 2, 3]'`
 * @param colorType
 * @returns
 */
export function tupleToColor(
	value: unknown,
	colorType: ColorType,
):
	| {
			color: ColorPlusObject
			format: ColorFormat
	  }
	| undefined {
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

export function colorToTuple(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): ColorTupleRgb | ColorTupleRgba | undefined {
	if (format.type !== 'tuple') {
		console.warn(`Invalid format type: ${format.type}`)
		return undefined
	}

	const { colorType } = format.format as TupleFormat
	const convertedColor = convert(color, format.space) ?? color

	const result = [
		convertedColor.coords[0] === null
			? null
			: convertedColor.coords[0] * (colorType === 'int' ? 255 : 1),
		convertedColor.coords[1] === null
			? null
			: convertedColor.coords[1] * (colorType === 'int' ? 255 : 1),
		convertedColor.coords[2] === null
			? null
			: convertedColor.coords[2] * (colorType === 'int' ? 255 : 1),
	]

	if (alphaOverride ?? format.alpha) {
		return [...result, convertedColor.alpha] as ColorTupleRgba
	}

	return result as ColorTupleRgb
}

export function colorToTupleString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	const tuple = colorToTuple(color, format, alphaOverride)

	if (tuple === undefined) {
		return undefined
	}

	const precision = (format.format as TupleFormat).colorType === 'int' ? 0 : 3
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
