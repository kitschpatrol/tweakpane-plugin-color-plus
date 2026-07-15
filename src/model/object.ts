import { mapRange } from '@tweakpane/core'
import type { ColorFormat, ColorPlusObject, ColorSpaceId, ColorType, ObjectFormat } from './shared'
import { convert, formatNumber, getRangeForChannel } from './shared'

/**
 * Interpret object keys graciously... allow for mixes of long and short
 * single-letter keys, plus likely aliases
 */
const colorObjectKeys: Array<{
	channels: Array<{ externalKeys: string[]; internalKey: string }>
	spaceId: ColorSpaceId
}> = [
	/*
	 * [HSL](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
	 * Int example: `{h: 270, s: 100, l: 80, a: .25}`
	 * Float example: `{h: .75, s: 1, l: .8, a: .25}`
	 */
	{
		channels: [
			{
				externalKeys: ['h', 'hue'],
				internalKey: 'h',
			},
			{
				externalKeys: ['s', 'sat', 'saturation'],
				internalKey: 's',
			},
			{
				externalKeys: ['l', 'light', 'lightness'],
				internalKey: 'l',
			},
			{
				externalKeys: ['a', 'alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'hsl',
	},
	/*
	 * HSV
	 * Also handles HSB, which is identical to HSV. Photoshop uses HSB.
	 * Int example: `{h: 270, s: 100, v: 80, a: .25}`
	 * Float example: `{h: .75, s: 1, v: .8, a: .25}`
	 */
	{
		channels: [
			{
				externalKeys: ['h', 'hue'],
				internalKey: 'h',
			},
			{
				externalKeys: ['s', 'sat', 'saturation'],
				internalKey: 's',
			},
			{
				externalKeys: ['b', 'bright', 'brightness', 'v', 'val', 'value'],
				internalKey: 'v',
			},
			{
				externalKeys: ['a', 'alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'hsv',
	},
	/*
	 * [HWB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hwb)
	 * Int example: `{h:, w: 100, b: 80, a: .25}`
	 * Float example: `{h: .75, w: 1, b: .8, a: .25}`
	 */
	{
		channels: [
			{
				externalKeys: ['h', 'hue'],
				internalKey: 'h',
			},
			{
				externalKeys: ['w', 'white', 'whiteness'],
				internalKey: 'w',
			},
			{
				externalKeys: ['b', 'black', 'blackness'],
				internalKey: 'b',
			},
			{
				externalKeys: ['a', 'alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'hwb',
	},
	/*
	 * [Lab](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lab)
	 * Int example: `{l: 25, a: -50, b: 100, a: .25}`
	 * Float example: `{l: .25, a: .3, b: .9, a: .25}`
	 * Note 'a' key for alpha is prohibited due to conflict with 'a' for the 'a' in Lab
	 */
	{
		channels: [
			{
				externalKeys: ['l', 'light', 'lightness'],
				internalKey: 'l',
			},
			{
				externalKeys: ['a', 'green-red', 'greenred', 'gr'],
				internalKey: 'a',
			},
			{
				externalKeys: ['b', 'blue-yellow', 'blueyellow', 'by'],
				internalKey: 'b',
			},
			{
				externalKeys: ['alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'lab',
	},
	/*
	 * [LCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch)
	 * Int example: `{l: 25, c: 50, h: 270, a: .25}`
	 * Float example: `{l: .25, c: .5, h: .33, a: .25}`
	 */
	{
		channels: [
			{
				externalKeys: ['l', 'light', 'lightness'],
				internalKey: 'l',
			},
			{
				externalKeys: ['c', 'chroma'],
				internalKey: 'c',
			},
			{
				externalKeys: ['h', 'hue'],
				internalKey: 'h',
			},
			{
				externalKeys: ['a', 'alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'lch',
	},
	/*
	 * [RGB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb)
	 * Int example: `{r: 255, g: 0, b: 0, a: .5 }`
	 * Float example: `{r: 1, g: 0, b: 0, a: .5}`
	 */
	{
		channels: [
			{
				externalKeys: ['r', 'red'],
				internalKey: 'r',
			},
			{
				externalKeys: ['g', 'green'],
				internalKey: 'g',
			},
			{
				externalKeys: ['b', 'blue'],
				internalKey: 'b',
			},
			{
				externalKeys: ['a', 'alpha', 'opacity'],
				internalKey: 'alpha',
			},
		],
		spaceId: 'srgb',
	},
]

/**
 * Map user-facing coordinate values (0-255 ints or 0-1 floats) in place to the
 * ranges colorjs uses internally for the color's space
 */
function mapCoordsToColorJsRanges(color: ColorPlusObject, colorType: ColorType): void {
	for (const [index, coordValue] of color.coords.entries()) {
		if (coordValue === null) {
			continue
		}

		const [colorJsLow, colorJsHigh] = getRangeForChannel(color.spaceId, index)

		// SRGB is the only supported space that's represented with 0-1 internally by ColorJS
		if (color.spaceId === 'srgb') {
			color.coords[index] =
				colorType === 'int' ? mapRange(coordValue, 0, 255, colorJsLow, colorJsHigh) : coordValue
		} else if (colorType === 'float') {
			color.coords[index] = mapRange(coordValue, 0, 1, colorJsLow, colorJsHigh)
		} else {
			color.coords[index] = coordValue
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumberRecord(value: unknown): value is Record<string, null | number> {
	if (!isRecord(value)) {
		return false
	}

	return Object.values(value).every((v) => v === null || typeof v === 'number')
}

/**
 * Convert an unknown object to a color object
 *
 * @param value Accepts objects or object-like strings, e.g. `'{r: 255, g: 0, b:
 *   0, a: .5 }'`
 */
export function objectToColor(
	value: unknown,
	colorType: ColorType,
): undefined | { color: ColorPlusObject; format: ColorFormat } {
	// Handle object-like strings, too
	const objectValue = typeof value === 'string' ? (parseObjectString(value) ?? value) : value

	if (!isNumberRecord(objectValue)) {
		return undefined
	}

	const lowerCaseValue = Object.fromEntries(
		Object.entries(objectValue).map(([k, v]) => [k.toLowerCase(), v]),
	)

	const inputKeys = new Set(Object.keys(lowerCaseValue).map((k) => k.toLowerCase()))

	for (const objectKeys of colorObjectKeys) {
		const { channels, spaceId } = objectKeys

		// Split channels into regular and alpha channels
		const regularChannels = channels.filter((c) => c.internalKey !== 'alpha')
		const alphaChannel = channels.find((c) => c.internalKey === 'alpha')

		// Check if all required (non-alpha) channels are present
		const hasAllRequiredChannels = regularChannels.every((channel) =>
			channel.externalKeys.some((key) => inputKeys.has(key.toLowerCase())),
		)

		// Check if all input keys map to valid channels (including alpha)
		const allInputKeysValid = [...inputKeys].every((inputKey) =>
			channels.some((channel) =>
				channel.externalKeys.some((key) => key.toLowerCase() === inputKey),
			),
		)

		if (hasAllRequiredChannels && allInputKeysValid) {
			const colorFormat: ColorFormat = {
				alpha: false, // May be overwritten
				format: {
					alphaKey: undefined, // May be overwritten
					colorType,
					coordKeys: ['', '', ''], // Will be overwritten
				},
				space: spaceId,
				type: 'object',
			}

			const result: ColorPlusObject = {
				alpha: 1,
				coords: [0, 0, 0],
				spaceId,
			}

			// Process regular channels
			for (const [index, channel] of regularChannels.entries()) {
				const matchingKey = channel.externalKeys.find((key) => inputKeys.has(key.toLowerCase()))

				if (matchingKey !== undefined) {
					const channelValue = lowerCaseValue[matchingKey.toLowerCase()]!

					;(colorFormat.format as ObjectFormat).coordKeys[index] = matchingKey
					result.coords[index] = channelValue
				}
			}

			// Handle alpha channel separately
			if (alphaChannel) {
				const alphaKey = alphaChannel.externalKeys.find((key) => inputKeys.has(key.toLowerCase()))

				if (alphaKey !== undefined) {
					// Alpha value provided

					;(colorFormat.format as ObjectFormat).alphaKey = alphaKey
					colorFormat.alpha = true
					result.alpha = lowerCaseValue[alphaKey.toLowerCase()]!
				}
			}

			// Map between float and int if needed
			mapCoordsToColorJsRanges(result, (colorFormat.format as ObjectFormat).colorType)

			return {
				color: result,
				format: colorFormat,
			}
		}
	}

	return undefined
}

export function colorToObject(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): Record<string, null | number> | undefined {
	if (format.type !== 'object') {
		console.warn(`Invalid format type: ${format.type}`)
		return undefined
	}

	if (colorObjectKeys.every((keys) => keys.spaceId !== format.space)) {
		console.warn(`Invalid color space for object conversion: ${format.space}`)
		return undefined
	}

	// TODO proper type guard
	const objectFormat = format.format as ObjectFormat

	const result: Record<string, null | number> = {}

	const convertedColor = convert(color, format.space) ?? color

	// Map between float and int if needed
	for (const [index, value] of convertedColor.coords.entries()) {
		const coordKey = objectFormat.coordKeys[index]
		if (value === null || coordKey === undefined) {
			continue
		}

		const [colorJsLow, colorJsHigh] = getRangeForChannel(format.space, index)

		if (format.space === 'srgb') {
			result[coordKey] =
				objectFormat.colorType === 'int' ? mapRange(value, colorJsLow, colorJsHigh, 0, 255) : value
		} else if (objectFormat.colorType === 'float') {
			result[coordKey] = mapRange(value, colorJsLow, colorJsHigh, 0, 1)
		} else {
			result[coordKey] = value
		}
	}

	if ((alphaOverride ?? format.alpha) && objectFormat.alphaKey !== undefined) {
		result[objectFormat.alphaKey] = convertedColor.alpha
	}

	return result
}

export function colorToObjectString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	const object = colorToObject(color, format, alphaOverride)

	if (object === undefined) {
		return undefined
	}

	const precision = (format.format as ObjectFormat).colorType === 'int' ? 0 : 3
	const precisionAlpha = 3
	return stringifyObject(object, precision, precisionAlpha)
}

function stringifyObject(
	object: Record<string, null | number>,
	precision: number,
	precisionAlpha: number,
): string {
	const parts: string[] = []
	let index = 0
	for (const [key, value] of Object.entries(object)) {
		parts.push(
			`${key}: ${value === null ? 'null' : formatNumber(value, index === 3 ? precisionAlpha : precision)}`,
		)
		index++
	}

	return `{${parts.join(', ')}}`
}

/**
 * Takes a semi-naive JSON5-esque color-like string object, and attempts to
 * parse it into an object If the bespoke parse pass fails, it will try to use
 * `JSON.parse` instead.
 */
function parseObjectString(value: string): Record<string, unknown> | undefined {
	try {
		return JSON.parse(value) as Record<string, unknown>
	} catch {
		// Manual parse
		// Strip certain characters and trim whitespace
		const parts = value
			.replaceAll(/["%',:\{\}]/gv, '')
			.split(' ')
			.map((part: string) => part.trim())
			.filter((part: string) => part !== '')

		// Must have even number of parts to parse manually
		if (parts.length % 2 !== 0) {
			return undefined
		}

		const object: Record<string, unknown> = {}

		for (let i = 0; i < parts.length - 1; i += 2) {
			const key = parts[i]
			if (typeof key !== 'string') {
				return undefined
			}

			const part = parts[i + 1]
			if (part === undefined) {
				return undefined
			}

			if (part === 'null') {
				object[key] = null
			} else {
				// eslint-disable-next-line unicorn/prefer-number-coercion -- parseFloat's tolerance of trailing units (e.g. `270deg`) is part of this parser's graciousness
				const number = Number.parseFloat(part)
				if (Number.isNaN(number)) {
					return undefined
				}

				object[key] = number
			}
		}

		return object
	}
}
