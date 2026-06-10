/*
 * Gamut math for the OKLCH picker, expressed through colorjs.io.
 *
 * Two primitives drive the plane: `maxChroma`, the largest in-gamut chroma at a
 * fixed lightness and hue, and `lightnessRange`, the in-gamut lightness band at a
 * fixed chroma and hue — both found by bisecting colorjs's `inGamut`.
 * A single mutable OKLCH probe object is reused across calls to avoid per-call
 * allocation in the per-frame raster loop (colorjs's `getColor` mutates and
 * caches the resolved space on it, so repeat calls skip the id lookup).
 */
import type { ColorConstructor } from 'colorjs.io/fn'
import { to as colorJsConvert, inGamut as colorJsInGamut } from 'colorjs.io/fn'

/** Upper bound for the chroma bisection — beyond every physical display gamut. */
export const CHROMA_CEILING = 0.5
/** Bisection steps: 16 ⇒ ~0.5/2¹⁶ ≈ 8e-6 chroma resolution. */
const BISECT_STEPS = 16

/**
 * RGB gamut ids by chroma extent, narrow → wide. Used to pick the widest
 * configured gamut (the plane's outer edge) and to order boundary lines.
 */
const GAMUT_ORDER = ['srgb', 'a98rgb', 'p3', 'rec2020', 'prophoto']

/** Accepted gamut strings → colorjs registry ids (CSS aliases normalized). */
const GAMUT_ALIASES: Record<string, string> = {
	'a98-rgb': 'a98rgb',
	a98rgb: 'a98rgb',
	'display-p3': 'p3',
	p3: 'p3',
	prophoto: 'prophoto',
	'prophoto-rgb': 'prophoto',
	rec2020: 'rec2020',
	srgb: 'srgb',
}

const probe: ColorConstructor = { alpha: undefined, coords: [0, 0, 0], spaceId: 'oklch' }
const globalMaxChromaCache = new Map<string, number>()

/**
 * Normalize a user-provided gamut string to a colorjs registry id, accepting
 * both colorjs ids and their CSS aliases. Returns undefined for unknown ids.
 */
export function normalizeGamutId(id: string): string | undefined {
	return GAMUT_ALIASES[id.toLowerCase()]
}

function probeInGamut(l: number, c: number, h: number, gamutId: string): boolean {
	probe.coords[0] = l
	probe.coords[1] = c
	probe.coords[2] = h
	// The colorjs default tolerance (7.5e-5) is far too loose near black: it accepts
	// colors whose RGB coords are within it, and since a narrower gamut maps a given
	// OKLCH to smaller coords, sRGB/P3 then spuriously "contain" more chroma than
	// wider gamuts there — a phantom boundary hook, plus an "out of gamut" label for
	// what is really white. A tiny epsilon instead tracks the true cube boundary (the
	// hook shrinks to a sub-pixel sliver at lightness 0) while still admitting white,
	// whose round-trip overshoots 1 by only a float rounding step.
	return colorJsInGamut(probe, gamutId, { epsilon: 1e-9 })
}

/**
 * Largest in-gamut OKLCH chroma at lightness `l` and hue `h` for `gamutId`, by
 * bisection. Returns 0 when the gamut doesn't contain the achromatic point at
 * this lightness (an empty row).
 */
export function maxChroma(l: number, h: number, gamutId: string, ceiling = CHROMA_CEILING): number {
	// The exact black/white poles are single achromatic points, so any chroma
	// the epsilon probe admits there is a float artifact: the transfer function
	// collapses real OKLCH chroma into sub-epsilon RGB coords (ProPhoto admits
	// ~0.001 at black). Left in, those phantom slivers hand the stretch
	// normalization inconsistent per-gamut bands at the poles.
	if (l <= 0 || l >= 1) {
		return 0
	}

	if (!probeInGamut(l, 0, h, gamutId)) {
		return 0
	}

	let inside = 0
	let outside = ceiling
	for (let i = 0; i < BISECT_STEPS; i++) {
		const mid = (inside + outside) / 2
		if (probeInGamut(l, mid, h, gamutId)) {
			inside = mid
		} else {
			outside = mid
		}
	}

	return inside
}

/**
 * Clamp OKLCH coordinates into `gamutId`: lightness is constrained to [0, 1],
 * then chroma is shed (at constant lightness and hue) down to the gamut's
 * maximum, mirroring the CSS gamut-mapping philosophy. Hue is never changed.
 * Coordinates already in gamut pass through unchanged.
 */
export function clampToGamut(
	l: number,
	c: number,
	h: number,
	gamutId: string,
	ceiling = CHROMA_CEILING,
): [number, number, number] {
	const clampedL = Math.max(0, Math.min(1, l))
	return [clampedL, Math.min(c, maxChroma(clampedL, h, gamutId, ceiling)), h]
}

/** Coarse lightness samples used to bracket the in-gamut band before bisection. */
const LIGHTNESS_SCAN_STEPS = 96

function bisectLightnessEdge(
	outside: number,
	inside: number,
	c: number,
	h: number,
	gamutId: string,
): number {
	let out = outside
	let ins = inside
	for (let i = 0; i < BISECT_STEPS; i++) {
		const mid = (out + ins) / 2
		if (probeInGamut(mid, c, h, gamutId)) {
			ins = mid
		} else {
			out = mid
		}
	}

	return ins
}

/**
 * In-gamut lightness band `[lo, hi]` at chroma `c` and hue `h` for `gamutId`,
 * found by a coarse scan to bracket the band then bisecting each edge. Returns
 * undefined when no lightness is in gamut at this chroma (the chroma exceeds
 * the gamut at every lightness). Assumes a single band, matching the OKLCH
 * gamut's shape at fixed chroma and hue.
 */
export function lightnessRange(
	c: number,
	h: number,
	gamutId: string,
): [number, number] | undefined {
	if (c <= 0) {
		return [0, 1]
	}

	let lo = -1
	let hi = -1
	for (let i = 0; i <= LIGHTNESS_SCAN_STEPS; i++) {
		const l = i / LIGHTNESS_SCAN_STEPS
		if (probeInGamut(l, c, h, gamutId)) {
			if (lo < 0) {
				lo = l
			}

			hi = l
		}
	}

	if (lo < 0) {
		return undefined
	}

	const step = 1 / LIGHTNESS_SCAN_STEPS
	const lower = lo <= 0 ? 0 : bisectLightnessEdge(lo - step, lo, c, h, gamutId)
	const upper = hi >= 1 ? 1 : bisectLightnessEdge(hi + step, hi, c, h, gamutId)
	return [lower, upper]
}

/** Convert an OKLCH coordinate to displayable RGB channels (0..1) in `targetId`. */
export function oklchToRgb(
	l: number,
	c: number,
	h: number,
	targetId: string,
): [number, number, number] {
	probe.coords[0] = l
	probe.coords[1] = c
	probe.coords[2] = h
	const { coords } = colorJsConvert(probe, targetId)
	return [coords[0] ?? 0, coords[1] ?? 0, coords[2] ?? 0]
}

/** Configured gamut ids ordered narrow → wide, for boundary-line draw order. */
export function gamutsByExtent(gamutIds: string[]): string[] {
	return GAMUT_ORDER.filter((id) => gamutIds.includes(id))
}

/**
 * UI display names for the supported RGB gamuts. colorjs's space `name` is used
 * where it reads well, but `a98rgb` ("Adobe® 98 RGB compatible") and `rec2020`
 * ("REC.2020") are overridden with the shorter forms shown in the picker.
 */
export const GAMUT_LABELS: Record<string, string> = {
	a98rgb: 'A98 RGB',
	p3: 'P3',
	prophoto: 'ProPhoto',
	rec2020: 'Rec2020',
	srgb: 'sRGB',
}

/**
 * The narrowest configured gamut that contains the OKLCH color, tested narrow →
 * wide. Returns undefined when the color falls outside every configured gamut.
 */
export function minimumGamut(
	l: number,
	c: number,
	h: number,
	gamutIds: string[],
): string | undefined {
	for (const id of gamutsByExtent(gamutIds)) {
		if (probeInGamut(l, c, h, id)) {
			return id
		}
	}

	return undefined
}

/** The widest (largest chroma extent) gamut among the configured ids. */
export function widestGamut(gamutIds: string[]): string {
	let widest = gamutIds[0] ?? 'srgb'
	for (const id of GAMUT_ORDER) {
		if (gamutIds.includes(id)) {
			widest = id
		}
	}

	return widest
}

/**
 * Hue-independent maximum chroma of a gamut, swept once across hue and
 * lightness and memoized. Fixes the chroma axis in perceptual mode so it never
 * rescales as the hue changes.
 */
export function computeGlobalMaxChroma(gamutId: string): number {
	const cached = globalMaxChromaCache.get(gamutId)
	if (cached !== undefined) {
		return cached
	}

	let max = 0
	for (let h = 0; h < 360; h += 5) {
		for (let l = 0.02; l < 1; l += 0.02) {
			const c = maxChroma(l, h, gamutId)
			if (c > max) {
				max = c
			}
		}
	}

	globalMaxChromaCache.set(gamutId, max)
	return max
}
