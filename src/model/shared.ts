import { mapRange } from '@tweakpane/core'
import {
	A98RGB,
	ColorSpace as ColorJsColorSpace,
	type ColorConstructor as ColorJsConstructor,
	to as colorJsConvert,
	serialize as colorJsSerialize,
	HSL,
	HSV,
	HWB,
	Lab,
	Lab_D65,
	LCH,
	Okhsv,
	OKLab,
	OKLCH,
	P3,
	type PlainColorObject as PlainColorJsObject,
	ProPhoto,
	REC_2020,
	sRGB,
	sRGB_Linear,
	XYZ_D50,
	XYZ_D65,
} from 'colorjs.io/fn'

// Loading color spaces that are either:
// - In the CSS 4 spec
// - Available in CSS function() style colors
// - Used by Tweakpane's original implementation
ColorJsColorSpace.register(A98RGB) // A98-rgb
ColorJsColorSpace.register(HSL) // Hsl(), hsla(), hsl,
ColorJsColorSpace.register(HSV) // --hsv (Tweakpane legacy)
ColorJsColorSpace.register(HWB) // Hwb(), hwb
ColorJsColorSpace.register(Lab_D65) // Lab-d65
ColorJsColorSpace.register(Lab) // Lab(), lab, (implicitly lab-d50, but the 'lab-d50' string is not supported)
ColorJsColorSpace.register(LCH) // Lch(), lch
ColorJsColorSpace.register(OKLab) // Oklab(), oklab
ColorJsColorSpace.register(OKLCH) // Oklch(), oklch
ColorJsColorSpace.register(Okhsv) // ?
ColorJsColorSpace.register(P3) // Display-p3
ColorJsColorSpace.register(ProPhoto) // Prophoto-rgb
ColorJsColorSpace.register(REC_2020) // Rec2020
ColorJsColorSpace.register(sRGB_Linear) // Srgb-linear
ColorJsColorSpace.register(sRGB) // Rgb(), rgba(), srgb
ColorJsColorSpace.register(XYZ_D50) // Xyz-d50
ColorJsColorSpace.register(XYZ_D65) // Xyz, xyz-d65

export type ColorType = 'float' | 'int'

// Subset of the full list to match what's supported / imported
export type ColorSpaceId =
	| 'a98-rgb'
	| 'display-p3'
	| 'hsl'
	| 'hsv'
	| 'hwb'
	| 'lab'
	| 'lab-d50'
	| 'lab-d65'
	| 'lch'
	| 'okhsv' // Used for internal representation, TODO add to docs and examples
	| 'oklab'
	| 'oklch'
	| 'prophoto-rgb'
	| 'rec2020'
	| 'srgb'
	| 'srgb-linear'
	| 'xyz'
	| 'xyz-d50'
	| 'xyz-d65'

export type Coords = [null | number, null | number, null | number]

export type ColorPlusObject = {
	alpha: number
	coords: Coords
	spaceId: ColorSpaceId
}

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
export type CoordFormat = {
	coordRange: [number, number] | undefined
	range: [number, number] | undefined
	type: string
}

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
export type StringFormat = {
	alphaType?: string
	commas?: boolean
	format: {
		alpha?: boolean | Record<string, unknown> | string
		coords: Array<CoordFormat | CoordFormat[]>
		name: string
		spaceCoords: number[] | undefined
		toGamut?: boolean
		type: string
		// Test: [Function: test],
		// parse: [Function: parse],
		// serialize: [Function: serialize],
		// space: [RGBColorSpace],
		// [Symbol(instance)]: [Circular *1]
	}
	formatId: string
	types: string[]
}

export type ObjectFormat = {
	alphaKey: string | undefined // Undefined if no alpha
	colorType: ColorType
	coordKeys: [string, string, string]
}

export type TupleFormat = {
	// Space is always SRGB
	colorType: ColorType
}

// TODO export?
// Nothing for now, but important to distinguish from non-object format strings
// eslint-disable-next-line ts/no-empty-object-type
type NumberFormat = {}

/**
 * Original format and alpha state inferred from the user-provided value
 */
export type ColorFormat = {
	alpha: boolean
	format: NumberFormat | ObjectFormat | string | StringFormat | TupleFormat
	space: ColorSpaceId
	type: 'number' | 'object' | 'string' | 'tuple'
}

/** Returns a new color object only if conversion is needed, otherwise returns undefined */
export function convert(
	color: ColorPlusObject,
	spaceId: ColorSpaceId,
	lastHue = 0,
): ColorPlusObject | undefined {
	if (color.spaceId === spaceId) {
		return undefined
	}

	const converted = colorJsConvert(color, spaceId)

	// Special case to handle rounding errors inducing huelucinations in achromatic colors
	if (spaceId === 'hsl' || spaceId === 'hsv') {
		if (converted.coords[1] !== null && Math.abs(converted.coords[1]) < 1e-8) {
			converted.coords[0] = lastHue
			converted.coords[1] = 0
		}

		if (converted.coords[2] !== null && Math.abs(converted.coords[2]) < 1e-8) {
			converted.coords[0] = lastHue
			converted.coords[2] = 0
		}
	}

	return getColorPlusObjectFromColorJsObject(converted)
}

export function setFromColorPlusObject(
	targetColor: ColorPlusObject,
	sourceColor: ColorPlusObject,
): void {
	targetColor.spaceId = sourceColor.spaceId
	targetColor.coords[0] = sourceColor.coords[0]
	targetColor.coords[1] = sourceColor.coords[1]
	targetColor.coords[2] = sourceColor.coords[2]
	targetColor.alpha = sourceColor.alpha
}

// Export function validateColorJsObject(
// 	colorJs: PlainColorJsObject | ColorJsConstructor,
// ): boolean {
// 	if (colorJs.coords.some((c) => c === null)) {
// 		return false;
// 	}
// 	return true;
// }

/** Does not validate! */
export function getColorPlusObjectFromColorJsObject(
	colorJs: ColorJsConstructor | PlainColorJsObject,
): ColorPlusObject {
	return {
		alpha: colorJs.alpha ?? 1,
		coords: [...(colorJs.coords as [number, number, number])],
		spaceId: ('spaceId' in colorJs ? colorJs.spaceId : colorJs.space.id) as ColorSpaceId,
	}
}

export function copyColorPlusObject(color: ColorPlusObject): ColorPlusObject {
	return {
		alpha: color.alpha,
		coords: [...color.coords],
		spaceId: color.spaceId,
	}
}

export function hexHasAlpha(hex: string): boolean {
	return hex.length === 5 || hex.length === 9
}

export function expandHex(hex: string): string {
	// Expects leading #
	const length_ = hex.length
	if (length_ === 4 || length_ === 5) {
		let result = '#'
		for (let i = 1; i < length_; i++) {
			result += hex[i] + hex[i]
		}

		return result
	}

	return hex
}

// Generic serialization...
export function serialize(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	if (typeof format.format !== 'string') {
		console.warn('Invalid format type')
		return undefined
	}

	const convertedColor = convert(color, format.space) ?? color

	const result = colorJsSerialize(convertedColor, {
		alpha: alphaOverride ?? format.alpha,
		format: format.format,
	})

	// Special case for hex to avoid #0f0-style truncation
	return format.format === 'hex' ? expandHex(result) : result
}

function getColorJsColorSpaceById(spaceId: ColorSpaceId): ColorJsColorSpace | undefined {
	try {
		const space = ColorJsColorSpace.get(spaceId)
		return space
	} catch {
		console.warn(`Unknown color space: ${spaceId}`)
		return undefined
	}
}

export function getRangeForChannel(spaceId: ColorSpaceId, channelIndex: number): [number, number] {
	const space = getColorJsColorSpaceById(spaceId)
	if (space === undefined) {
		throw new Error(`Unknown color space: ${spaceId}`)
	}

	// Assumes correctly ordered channels...
	// Not sure how to get channel name to index map from color space
	const coordMeta = Object.values(space.coords).at(channelIndex)
	const range = coordMeta?.range ?? coordMeta?.refRange ?? undefined

	if (range === undefined) {
		throw new Error(`Unknown range for channel: ${channelIndex}`)
	}

	return range
}

/**
 * Round a number to a certain number of significant digits after the decimal point
 * @param n - The number to round
 * @param decimalPrecision - Number of digits after the decimal point
 * @returns The rounded number
 * @example
 * toDecimalPrecision(3.14159, 2) // returns 3.14
 * toDecimalPrecision(10.9999, 1) // returns 11.0
 * toDecimalPrecision(123.456, 0) // returns 123
 */
export function toDecimalPrecision(n: number, decimalPrecision: number | undefined): number {
	if (
		decimalPrecision === undefined ||
		// eslint-disable-next-line ts/no-unnecessary-condition
		decimalPrecision === null ||
		decimalPrecision < 0 ||
		!Number.isInteger(decimalPrecision) ||
		!Number.isFinite(n)
	) {
		return n
	}

	if (decimalPrecision === 0) {
		return Math.round(n)
	}

	// Calculate the multiplier based on decimal precision
	const multiplier = 10 ** decimalPrecision

	// Round the number using the multiplier
	return Math.round(n * multiplier) / multiplier
}

export function formatNumber(value: number, digits: number | undefined): string {
	if (digits === undefined) {
		return value.toString()
	}

	return value.toFixed(Math.max(Math.min(digits, 20), 0))
}

/**
 * Type check for string format object type
 */
export function isStringFormat(format: ColorFormat['format']): format is StringFormat {
	return (
		typeof format === 'object' &&
		// eslint-disable-next-line ts/no-unnecessary-condition
		format !== null &&
		'formatId' in format &&
		'format' in format &&
		typeof format.format === 'object' &&
		// eslint-disable-next-line ts/no-unnecessary-condition
		format.format !== null &&
		'type' in format.format &&
		typeof format.format.type === 'string'
	)
}

/**
 *  Some formats are parsable by Color.js but not serializable, e.g. keyword
 *  formats like `'blue'`. We can accept these after the format is initialized,
 *  but not as an initial color value.
 * @returns true if the format is serializable
 */
export function formatIsSerializable(format: ColorFormat): boolean {
	// Reimplement canSerialize() from colorjs
	if (isStringFormat(format.format)) {
		return format.format.format.type === 'function' || 'serialize' in format.format.format
	}

	// Assume all other formats are serializable
	return true
}

/**
 * Currently unused
 * @public
 */
export function applyDecimalPrecision(
	targetColor: ColorPlusObject,
	decimalPrecision: number,
	includeAlpha = true,
): void {
	targetColor.coords[0] =
		targetColor.coords[0] === null
			? null
			: toDecimalPrecision(targetColor.coords[0], decimalPrecision)
	targetColor.coords[1] =
		targetColor.coords[1] === null
			? null
			: toDecimalPrecision(targetColor.coords[1], decimalPrecision)
	targetColor.coords[2] =
		targetColor.coords[2] === null
			? null
			: toDecimalPrecision(targetColor.coords[2], decimalPrecision)
	if (includeAlpha) {
		targetColor.alpha = toDecimalPrecision(targetColor.alpha, decimalPrecision)
	}
}

export function colorPlusObjectsAreEqual(a: ColorPlusObject, b: ColorPlusObject): boolean {
	return (
		a.spaceId === b.spaceId &&
		a.alpha === b.alpha &&
		a.coords[0] === b.coords[0] &&
		a.coords[1] === b.coords[1] &&
		a.coords[2] === b.coords[2]
	)
}

/**
 * Currently unused
 * @public
 */
export function denormalizeCoords(space: ColorSpaceId, coords: Coords): Coords {
	coords[0] = denormalizeCoord(space, 0, coords[0])
	coords[1] = denormalizeCoord(space, 1, coords[1])
	coords[2] = denormalizeCoord(space, 2, coords[2])
	return coords
}

/**
 * Currently unused
 * @public
 */
export function normalizeCoords(space: ColorSpaceId, coords: Coords): Coords {
	coords[0] = normalizeCoord(space, 0, coords[0])
	coords[1] = normalizeCoord(space, 1, coords[1])
	coords[2] = normalizeCoord(space, 2, coords[2])
	return coords
}

export function normalizeCoord(
	space: ColorSpaceId,
	channelIndex: number,
	value: null | number,
): null | number {
	if (value === null) {
		return null
	}

	const range = getRangeForChannel(space, channelIndex)
	return mapRange(value, range[0], range[1], 0, 1)
}

export function denormalizeCoord(
	space: ColorSpaceId,
	channelIndex: number,
	value: null | number,
): null | number {
	if (value === null) {
		return null
	}

	const range = getRangeForChannel(space, channelIndex)
	return mapRange(value, 0, 1, range[0], range[1])
}
