import { expect, it } from 'vitest'
// Registers the colorjs color spaces (oklch, srgb, p3, rec2020, ...) by side effect
import '../src/model/shared.js'
import {
	clampToGamut,
	computeGlobalMaxChroma,
	gamutsByExtent,
	maxChroma,
	normalizeGamutId,
	oklchToRgb,
	widestGamut,
} from '../src/model/gamut.js'

it('normalizes colorjs ids and CSS aliases, rejecting unknowns', () => {
	expect(normalizeGamutId('srgb')).toBe('srgb')
	expect(normalizeGamutId('display-p3')).toBe('p3')
	expect(normalizeGamutId('A98-RGB')).toBe('a98rgb')
	expect(normalizeGamutId('prophoto-rgb')).toBe('prophoto')
	expect(normalizeGamutId('banana')).toBeUndefined()
})

it('orders gamuts narrow → wide and picks the widest', () => {
	expect(gamutsByExtent(['rec2020', 'srgb', 'p3'])).toEqual(['srgb', 'p3', 'rec2020'])
	expect(widestGamut(['srgb', 'p3', 'rec2020'])).toBe('rec2020')
	expect(widestGamut(['srgb'])).toBe('srgb')
})

it('finds a larger chroma boundary for wider gamuts at a given slice', () => {
	// At a fixed lightness/hue, P3 strictly contains sRGB. Rec2020 contains both
	// overall, but colorjs models its transfer function such that a single slice
	// can tie with P3 — so the strict Rec2020 > P3 ordering is asserted globally.
	const srgb = maxChroma(0.6, 30, 'srgb')
	const p3 = maxChroma(0.6, 30, 'p3')
	const rec2020 = maxChroma(0.6, 30, 'rec2020')
	expect(srgb).toBeGreaterThan(0)
	expect(p3).toBeGreaterThan(srgb)
	expect(rec2020).toBeGreaterThan(srgb)
})

it('returns 0 chroma where a gamut is empty (lightness above white)', () => {
	expect(maxChroma(1.5, 30, 'srgb')).toBe(0)
})

it('computes a hue-independent global max chroma ordered by gamut width', () => {
	const srgb = computeGlobalMaxChroma('srgb')
	const p3 = computeGlobalMaxChroma('p3')
	const rec2020 = computeGlobalMaxChroma('rec2020')
	expect(p3).toBeGreaterThan(srgb)
	expect(rec2020).toBeGreaterThan(p3)
	expect(rec2020).toBeGreaterThan(0.3)
	expect(rec2020).toBeLessThan(0.5)
})

it('converts OKLCH to displayable RGB channels in [0, 1]', () => {
	const [r, g, b] = oklchToRgb(0.6, 0.1, 30, 'srgb')
	for (const channel of [r, g, b]) {
		expect(channel).toBeGreaterThanOrEqual(0)
		expect(channel).toBeLessThanOrEqual(1)
	}

	// A zero-chroma OKLCH color is achromatic: all three channels are equal.
	const [gr, gg, gb] = oklchToRgb(0.5, 0, 0, 'srgb')
	expect(gg).toBeCloseTo(gr, 6)
	expect(gb).toBeCloseTo(gr, 6)
	expect(gr).toBeGreaterThan(0)
	expect(gr).toBeLessThan(1)
})

it('clamps OKLCH coordinates into a gamut by shedding chroma at constant lightness and hue', () => {
	// In-gamut coordinates pass through unchanged.
	expect(clampToGamut(0.6, 0.1, 30, 'srgb')).toEqual([0.6, 0.1, 30])

	// Excess chroma is shed to the gamut's frontier; lightness and hue are kept.
	const [l, c, h] = clampToGamut(0.65, 0.4, 13, 'rec2020')
	expect(l).toBe(0.65)
	expect(h).toBe(13)
	expect(c).toBeLessThan(0.4)
	expect(c).toBeCloseTo(maxChroma(0.65, 13, 'rec2020'), 10)

	// Out-of-range lightness is constrained to [0, 1]. The poles are single
	// achromatic points, so chroma collapses to exactly 0 there (maxChroma
	// rejects the phantom epsilon sliver — see the pole guard in gamut.ts).
	expect(clampToGamut(1.5, 0.2, 30, 'srgb')).toEqual([1, 0, 30])
	expect(clampToGamut(-0.5, 0.2, 30, 'srgb')).toEqual([0, 0, 30])
})
