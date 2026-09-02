/* eslint-disable no-bitwise */
import type { ColorFormat, ColorPlusObject, NumberColorFormat } from './shared'
import { convert } from './shared'

/**
 * Reads a number as a packed sRGB color, mirroring Tweakpane's built-in number
 * color input bit for bit. With the alpha flag the lowest byte is alpha,
 * otherwise the low three bytes are RGB and anything above them is discarded.
 * Like the built-in, any number is accepted: fractions truncate, negatives
 * wrap, and NaN reads as black. A value that doesn't fit is warned about.
 */
export function numberToColor(
	value: unknown,
	hasAlpha?: boolean,
): undefined | { color: ColorPlusObject; format: ColorFormat } {
	if (typeof value !== 'number') {
		// No need to parse strings here because stringToColor will catch them
		return undefined
	}

	const packed = hasAlpha === true ? value >>> 0 : value & 0xff_ff_ff
	if (packed !== value) {
		console.warn(
			hasAlpha === true
				? `Number color ${value} is not an integer from 0 to 0xffffffff; reading it as 0x${packed.toString(16)}`
				: `Number color ${value} is not an integer from 0 to 0xffffff; reading it as 0x${packed.toString(16)}. Set color.alpha to true if the lowest byte is alpha.`,
		)
	}

	const [r, g, b, alpha]: [number, number, number, number] =
		hasAlpha === true
			? [packed >>> 24, (packed >>> 16) & 0xff, (packed >>> 8) & 0xff, (packed & 0xff) / 255]
			: [packed >>> 16, (packed >>> 8) & 0xff, packed & 0xff, 1]

	return {
		color: {
			alpha,
			coords: [r / 255, g / 255, b / 255],
			spaceId: 'srgb',
		},
		format: {
			alpha: hasAlpha === true,
			format: {},
			space: 'srgb',
			type: 'number',
		},
	}
}

export function colorToNumber(
	color: ColorPlusObject,
	format: NumberColorFormat,
	alphaOverride?: boolean,
): number {
	// Always SRGB
	const converted = convert(color, 'srgb') ?? color

	const [r, g, b] = converted.coords

	// Convert from 0-1 range to 0-255 range and round to integers
	const ri = Math.round((r ?? 0) * 255)
	const gi = Math.round((g ?? 0) * 255)
	const bi = Math.round((b ?? 0) * 255)

	const includeAlpha = alphaOverride ?? format.alpha
	if (includeAlpha) {
		const a = Math.round(converted.alpha * 255)
		return ((ri << 24) | (gi << 16) | (bi << 8) | a) >>> 0
	}

	return ((ri << 16) | (gi << 8) | bi) >>> 0
}

export function colorToNumberString(
	color: ColorPlusObject,
	format: NumberColorFormat,
	alphaOverride?: boolean,
): string {
	const value = colorToNumber(color, format, alphaOverride)
	const includeAlpha = alphaOverride ?? format.alpha
	return '0x' + value.toString(16).padStart(includeAlpha ? 8 : 6, '0')
}
