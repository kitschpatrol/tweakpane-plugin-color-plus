/* eslint-disable no-bitwise */
import type { ColorFormat, ColorPlusObject } from './shared'
import { convert } from './shared'
import { stringToColor } from './string'

export function numberToColor(
	value: unknown,
	hasAlpha?: boolean,
): undefined | { color: ColorPlusObject; format: ColorFormat } {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		// No need to parse strings here because stringToColor will catch them
		return undefined
	}

	if (value < 0 || value > 0xff_ff_ff_ff) {
		console.warn(`Invalid number value: ${value}`)
		return undefined
	}

	const colorString = '#' + value.toString(16)
	const result = stringToColor(colorString)
	if (result === undefined) {
		return undefined
	}

	const { color, format: stringFormat } = result

	return {
		color,
		format: {
			alpha: hasAlpha === true || stringFormat.alpha,
			format: {},
			space: 'srgb',
			type: 'number',
		},
	}
}

export function colorToNumber(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): number | undefined {
	if (format.type !== 'number') {
		console.warn(`Invalid format type: ${format.type}`)
		return undefined
	}

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
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	const value = colorToNumber(color, format, alphaOverride)

	if (value === undefined) {
		return undefined
	}

	const includeAlpha = alphaOverride ?? format.alpha
	// TODO alpha should be ff?
	return '0x' + value.toString(16).padStart(includeAlpha ? 8 : 6, '0')
}
