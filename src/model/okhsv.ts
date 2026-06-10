/*
 * OKHSV-style projection of the OKLCH lightness×chroma plane, used by the picker
 * in stretch mode so the gamut fills the square with the most-vivid color pinned
 * to a corner (like a classic HSV picker) instead of floating mid-plane.
 *
 * For a fixed hue the gamut slice is a triangle: black (L=0, C=0), white (L=1,
 * C=0), and the cusp (the maximum-chroma point). We parameterize it by value V
 * (distance from black, 0..1) and saturation S (toward the cusp, 0..1):
 *
 *   S=0 -> achromatic axis    S=1 -> the black→cusp edge (most saturated)
 *   V=0 -> black              V=1 -> the gamut boundary along the current ray
 *
 * so (S=1, V=1) is the cusp, (S=0, V=1) is white, and V=0 is black. The cusp and
 * the boundary come from our own `maxChroma`, so this tracks the configured
 * gamut and stays in OKLCH internally — unlike OKHSL/OKHSV's sRGB-locked
 * definitions. (This omits Ottosson's lightness "toe"; value is linear in L.)
 */
import { maxChroma } from './gamut.js'

/** Lightness samples used to locate the cusp and trace the gamut boundary. */
const PROFILE_SAMPLES = 96

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

/** Per-hue gamut shape the OKHSV map needs: the cusp and the max-chroma curve. */
export type OkhsvProfile = {
	chromaByLightness: Float64Array
	cuspChroma: number
	cuspLightness: number
	saturationMax: number
}

// A hue-slider drag needs the outgoing and incoming hue's profiles every
// pointer event, and the plane repaint needs the incoming one again; this tiny
// cache collapses those rebuilds. Bounded so a continuous drag (every hue
// distinct) can't grow it without limit.
const profileCache = new Map<string, OkhsvProfile>()
const PROFILE_CACHE_LIMIT = 8

/**
 * Build the OKHSV profile for a hue and gamut by sampling `maxChroma` over
 * lightness.
 */
export function buildOkhsvProfile(hue: number, gamutId: string): OkhsvProfile {
	const cacheKey = `${hue}:${gamutId}`
	const cached = profileCache.get(cacheKey)
	if (cached !== undefined) {
		return cached
	}

	const chromaByLightness = new Float64Array(PROFILE_SAMPLES)
	let cuspLightness = 0
	let cuspChroma = 0
	for (let i = 0; i < PROFILE_SAMPLES; i++) {
		const l = i / (PROFILE_SAMPLES - 1)
		const c = maxChroma(l, hue, gamutId)
		chromaByLightness[i] = c
		if (c > cuspChroma) {
			cuspChroma = c
			cuspLightness = l
		}
	}

	const saturationMax = cuspLightness > 0 ? cuspChroma / cuspLightness : 0
	const profile = { chromaByLightness, cuspChroma, cuspLightness, saturationMax }
	if (profileCache.size >= PROFILE_CACHE_LIMIT) {
		profileCache.clear()
	}

	profileCache.set(cacheKey, profile)
	return profile
}

/**
 * Lightness/chroma where a ray from black of slope `slope` (= chroma /
 * lightness) meets the gamut boundary, found by scanning the max-chroma curve
 * from the cusp toward white. Slope 0 returns white; slopes up to
 * `saturationMax` walk down the upper edge to the cusp.
 */
function boundaryAlongRay(profile: OkhsvProfile, slope: number): [number, number] {
	const { chromaByLightness, cuspLightness } = profile
	const last = chromaByLightness.length - 1
	const startIndex = Math.max(0, Math.floor(cuspLightness * last))
	let previousLightness = startIndex / last
	let previousGap = chromaByLightness[startIndex] - slope * previousLightness
	for (let i = startIndex + 1; i <= last; i++) {
		const l = i / last
		const gap = chromaByLightness[i] - slope * l
		if (gap <= 0) {
			const t = previousGap > gap ? previousGap / (previousGap - gap) : 0
			const lightness = previousLightness + (l - previousLightness) * t
			return [lightness, slope * lightness]
		}

		previousLightness = l
		previousGap = gap
	}

	return [1, slope]
}

/** OKHSV saturation/value (both 0..1) to OKLCH lightness/chroma. */
export function okhsvToLightnessChroma(
	profile: OkhsvProfile,
	saturation: number,
	value: number,
): [number, number] {
	const slope = clamp01(saturation) * profile.saturationMax
	const [topLightness, topChroma] = boundaryAlongRay(profile, slope)
	const v = clamp01(value)
	return [v * topLightness, v * topChroma]
}

/** OKLCH lightness/chroma to OKHSV saturation/value (both 0..1). */
export function lightnessChromaToOkhsv(
	profile: OkhsvProfile,
	lightness: number,
	chroma: number,
): [number, number] {
	const slope = lightness > 0 ? chroma / lightness : 0
	const saturation = profile.saturationMax > 0 ? clamp01(slope / profile.saturationMax) : 0
	const [topLightness] = boundaryAlongRay(profile, Math.min(slope, profile.saturationMax))
	const value = topLightness > 0 ? clamp01(lightness / topLightness) : 0
	return [saturation, value]
}
