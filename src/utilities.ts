import { isObject, parsePickerLayout, parseRecord } from '@tweakpane/core'
import type { PaletteProjection, PlaneLayout } from './model/channel'
import type { ColorPlus } from './model/color-plus'
import type { ColorFormat, ColorSpaceId, ColorType, GamutMethod } from './model/shared'
import type { ColorPlusInputParams } from './plugin'
import type { ColorTextsMode } from './view/color-texts'
import type { GamutLines } from './view/plane-palette'
import { PLANE_LAYOUTS } from './model/channel.js'
import { clampToGamut, normalizeGamutId, widestGamut } from './model/gamut.js'
import { isStringFormat } from './model/shared.js'

/**
 * Option defaults that adapt to the gamut reach of the initially bound color's
 * model: a color registered in an sRGB-bound model (hex, rgb, hsl, ...) gets a
 * simple sRGB picker, while a wide or perceptual model (oklch, lab, display-p3,
 * ...) gets the full wide-gamut treatment.
 */
type AdaptiveDefaults = {
	gamutLabel: boolean
	gamuts: string[]
	textsMode: ColorTextsMode
}

const SRGB_DEFAULTS: AdaptiveDefaults = {
	gamutLabel: false,
	gamuts: ['srgb'],
	textsMode: 'hsv',
}

const WIDE_DEFAULTS: AdaptiveDefaults = {
	gamutLabel: true,
	gamuts: ['srgb', 'p3'],
	textsMode: 'oklch',
}

/** Color models whose values can't reach outside the sRGB gamut. */
const SRGB_BOUND_SPACES = new Set<ColorSpaceId>([
	'hsl',
	'hsv',
	'hwb',
	'okhsv',
	'srgb',
	'srgb-linear',
])

/**
 * Pick the adaptive option defaults matching the gamut reach of the bound
 * color's model.
 */
export function defaultsForFormat(format: ColorFormat): AdaptiveDefaults {
	return SRGB_BOUND_SPACES.has(format.space) ? SRGB_DEFAULTS : WIDE_DEFAULTS
}

/** Texts drop-down modes that share their name with a color space id. */
const TEXTS_MODE_SPACES = ['hsl', 'hsv', 'okhsv', 'oklch', 'srgb'] as const

/**
 * The texts drop-down mode matching the bound color's own model, falling back
 * to the adaptive default (HSV for sRGB-bound models, OKLCH for wide).
 */
export function textsModeForFormat(format: ColorFormat): ColorTextsMode {
	if (
		format.type === 'number' ||
		(isStringFormat(format.format) && format.format.formatId === 'hex')
	) {
		return 'hex'
	}

	const mode = TEXTS_MODE_SPACES.find((id) => id === format.space)
	return mode ?? defaultsForFormat(format).textsMode
}

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

/**
 * Pull a color inside the widest of the configured gamuts by constraining
 * lightness to [0, 1] and shedding chroma at constant lightness and hue.
 *
 * @returns True when the color was out of gamut and had to change.
 */
export function clampColorToGamut(color: ColorPlus, gamuts: string[]): boolean {
	const [l, c, h] = color.getAll('oklch')
	const [clampedL, clampedC, clampedH] = clampToGamut(
		finite(l),
		finite(c),
		finite(h),
		widestGamut(gamuts),
	)
	if (clampedL === finite(l) && clampedC === finite(c)) {
		return false
	}

	color.setAll([clampedL, clampedC, clampedH], 'oklch')
	return true
}

/**
 * Parse the user-provided binding params into typed plugin options, returning
 * undefined when the record doesn't match the expected shape.
 */
export function parseColorInputParams(
	params: Record<string, unknown>,
): ColorPlusInputParams | undefined {
	return parseRecord<ColorPlusInputParams>(params, (p) => ({
		color: p.optional.object({
			// Legacy, only applies to number values
			alpha: p.optional.boolean,
			formatLocked: p.optional.boolean,
			// Legacy, only applies to object values?
			type: p.optional.custom(parseColorType),
		}),
		constrain: p.optional.boolean,
		expanded: p.optional.boolean,
		gamutLabel: p.optional.boolean,
		gamutLines: p.optional.custom(parseGamutLines),
		gamuts: p.optional.array(p.required.string),
		paletteChannels: p.optional.custom(parsePaletteChannels),
		paletteProjection: p.optional.custom(parsePaletteProjection),
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
		swatchFallback: p.optional.custom(parseGamutMethod),
		textFields: p.optional.boolean,
	}))
}

/**
 * Normalize user-provided gamut strings to colorjs registry ids, dropping
 * unknown ids with a warning and falling back to `fallback` when empty.
 */
export function normalizeGamuts(gamuts: string[] | undefined, fallback: string[]): string[] {
	if (gamuts === undefined || gamuts.length === 0) {
		return [...fallback]
	}

	const result: string[] = []
	for (const id of gamuts) {
		const normalized = normalizeGamutId(id)
		if (normalized === undefined) {
			console.warn(`ColorPlus: unknown gamut "${id}"... ignoring`)
		} else if (!result.includes(normalized)) {
			result.push(normalized)
		}
	}

	return result.length > 0 ? result : [...fallback]
}

function parseColorType(value: unknown): ColorType | undefined {
	return value === 'int' ? 'int' : value === 'float' ? 'float' : undefined
}

function parseGamutMethod(value: unknown): GamutMethod | undefined {
	return value === 'clip' ? 'clip' : value === 'css' ? 'css' : undefined
}

/**
 * Resolve a paletteChannels string to a known `PlaneLayout`, warning and
 * falling back to the default when it isn't one of the six permutations.
 */
function parsePaletteChannels(value: unknown): PlaneLayout {
	if (typeof value === 'string') {
		const upper = value.toUpperCase()
		for (const id of PLANE_LAYOUTS) {
			if (id === upper) {
				return id
			}
		}
	}

	console.warn(`ColorPlus: unknown paletteChannels "${String(value)}"... using CL_H`)
	return 'CL_H'
}

/**
 * Resolve a gamutLines string, warning and falling back to the default when it
 * isn't a known value.
 */
function parseGamutLines(value: unknown): GamutLines {
	if (value === 'all' || value === 'inner' || value === 'none' || value === 'outer') {
		return value
	}

	console.warn(`ColorPlus: unknown gamutLines "${String(value)}"... using inner`)
	return 'inner'
}

/**
 * Resolve a paletteProjection string, warning and falling back to the default
 * when it isn't a known value.
 */
function parsePaletteProjection(value: unknown): PaletteProjection {
	if (value === 'okhsv' || value === 'perceptual' || value === 'stretch') {
		return value
	}

	console.warn(`ColorPlus: unknown paletteProjection "${String(value)}"... using okhsv`)
	return 'okhsv'
}

/**
 * Drop option combinations that don't apply to the bound value's type (alpha
 * mode is number-only, float mode is object/array-only), warning when an option
 * is ignored.
 */
export function validateColorInputParams(
	params: ColorPlusInputParams,
	colorValue: unknown,
): ColorPlusInputParams {
	if (params.color?.alpha !== undefined && typeof colorValue !== 'number') {
		console.warn('ColorPlus: alpha mode is only supported for number values... ignoring')
		params.color.alpha = undefined
	}

	if (params.color?.type === 'float' && !isObject(colorValue) && !Array.isArray(colorValue)) {
		console.warn('ColorPlus: float mode is only supported for object or array values... ignoring')
		params.color.type = 'int'
	}

	return params
}
