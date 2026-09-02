import type { Value } from '@tweakpane/core'
import { createValue, isObject, parsePickerLayout, parseRecord } from '@tweakpane/core'
import type { PaletteProjection, PlaneLayout } from './model/channel'
import type { ColorPlus } from './model/color-plus'
import type { ColorFormat, ColorSpaceId, ColorType, GamutMethod } from './model/shared'
import type { ColorPlusInputParams } from './plugin'
import type { ColorTextsMode } from './view/color-texts'
import type { GamutLines } from './view/plane-palette'
import { PLANE_LAYOUTS } from './model/channel.js'
import { clampToGamut, normalizeGamutId, widestGamut } from './model/gamut.js'
import { nearestKeywordSrgb } from './model/keywords.js'
import { isStringFormat } from './model/shared.js'
import { connectValues } from './model/value-sync.js'

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
		(isStringFormat(format.format) &&
			// Keywords have no numeric text representation of their own; hex is the
			// canonical compact sRGB form
			(format.format.formatId === 'hex' || format.format.formatId === 'keyword'))
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
 * A copy of the color snapped to the perceptually-nearest CSS named color
 * (exact keyword sRGB coordinates, alpha untouched).
 */
export function snapToNearestKeyword(color: ColorPlus): ColorPlus {
	const snapped = color.clone()
	const [l, c, h] = snapped.getAll('oklch')
	snapped.setAll([...nearestKeywordSrgb(finite(l), finite(c), finite(h))], 'srgb')
	return snapped
}

/**
 * A display-side mirror of a color value for quantized named-color bindings:
 * reads snap to the nearest CSS named color in real time (so the swatch and
 * text fields always show the keyword the bound value will receive), while
 * writes pass through to the primary unsnapped, preserving the continuous
 * internal color that the plane reticle and sliders track.
 */
export function createKeywordDisplayValue(primary: Value<ColorPlus>): {
	disconnect: () => void
	value: Value<ColorPlus>
} {
	const value = createValue(snapToNearestKeyword(primary.rawValue), {
		equals: (a, b) => a.equals(b),
	})
	const disconnect = connectValues({
		backward: (_, secondary) => secondary,
		forward: (p) => snapToNearestKeyword(p),
		primary,
		secondary: value,
	})
	return { disconnect, value }
}

// Option value parsers, in the style of Tweakpane's built-in inputs: an
// unrecognized value is undefined, which fails the record parse so the plugin
// declines the binding

function parseColorType(value: unknown): ColorType | undefined {
	return value === 'float' || value === 'int' ? value : undefined
}

function parseGamutId(value: unknown): string | undefined {
	return typeof value === 'string' ? normalizeGamutId(value) : undefined
}

const GAMUT_LINES_VALUES: GamutLines[] = ['all', 'inner', 'none', 'outer']

function parseGamutLines(value: unknown): GamutLines | undefined {
	return GAMUT_LINES_VALUES.find((id) => id === value)
}

function parseGamutMethod(value: unknown): GamutMethod | undefined {
	return value === 'clip' || value === 'css' ? value : undefined
}

function parsePaletteChannels(value: unknown): PlaneLayout | undefined {
	return typeof value === 'string'
		? PLANE_LAYOUTS.find((id) => id === value.toUpperCase())
		: undefined
}

const PALETTE_PROJECTION_VALUES: PaletteProjection[] = ['okhsv', 'perceptual', 'stretch']

function parsePaletteProjection(value: unknown): PaletteProjection | undefined {
	return PALETTE_PROJECTION_VALUES.find((id) => id === value)
}

/**
 * Parse the user-provided binding params into typed plugin options. Returns
 * undefined when the record doesn't match the expected shape or an option has
 * an unrecognized value, in which case the plugin declines the binding like
 * Tweakpane's built-in inputs do.
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
		gamuts: p.optional.array(p.required.custom(parseGamutId)),
		paletteChannels: p.optional.custom(parsePaletteChannels),
		paletteProjection: p.optional.custom(parsePaletteProjection),
		picker: p.optional.custom(parsePickerLayout),
		readonly: p.optional.constant(false),
		swatchFallback: p.optional.custom(parseGamutMethod),
		textFields: p.optional.boolean,
	}))
}

/**
 * Deduplicate the configured gamut ids (already normalized to colorjs ids by
 * the params parser), falling back to `fallback` when none were configured.
 */
export function resolveGamuts(gamuts: string[] | undefined, fallback: string[]): string[] {
	const unique = [...new Set(gamuts)]
	return unique.length > 0 ? unique : [...fallback]
}

/**
 * Drop option combinations that don't apply to the bound value's type (alpha
 * mode is number-only, float mode is object/array-only), warning when an option
 * is ignored.
 */
export function validateColorInputParams(params: ColorPlusInputParams, colorValue: unknown): void {
	if (typeof colorValue !== 'number' && params.color?.alpha !== undefined) {
		console.warn('ColorPlus: alpha mode is only supported for number values... ignoring')
		params.color.alpha = undefined
	}

	if (params.color?.type === 'float' && !isObject(colorValue) && !Array.isArray(colorValue)) {
		console.warn('ColorPlus: float mode is only supported for object or array values... ignoring')
		params.color.type = 'int'
	}
}
