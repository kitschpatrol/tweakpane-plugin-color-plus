import { expect, it } from 'vitest'
// Registers the colorjs color spaces (oklch, srgb, p3, rec2020, ...) by side effect
import '../src/model/shared'
import { ColorPlus } from '../src/model/color-plus'
import {
	clampToGamut,
	computeGlobalMaxChroma,
	gamutsByExtent,
	lightnessRange,
	maxChroma,
	minimumGamut,
	normalizeGamutId,
	oklchToRgb,
	widestGamut,
} from '../src/model/gamut'

function oklchOf(input: string): [number, number, number] {
	const color = ColorPlus.create(input)!
	color.convert('oklch')
	return color.getAll('oklch') as [number, number, number]
}

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

it.each([
	['#000000', 'srgb'],
	['#0000ff', 'srgb'],
	['#00ff00', 'srgb'],
	['#00ffff', 'srgb'],
	['#ff0000', 'srgb'],
	['#ff00ff', 'srgb'],
	['#ffff00', 'srgb'],
	['#ffffff', 'srgb'],
	// Every color on the black-to-blue edge shares blue's hue and sits past the same gap
	['navy', 'srgb'],
	// Rec2020's blue corner has the same gap and round-trips with ~3e-7 conversion noise
	['color(rec2020 0 0 1)', 'rec2020'],
	// These primaries also round-trip with noise that puts them just outside their own cube
	['color(rec2020 0 1 0)', 'rec2020'],
	['color(a98-rgb 0 1 0)', 'a98rgb'],
])('keeps the in-gamut color %s unchanged when clamping into %s', (input, gamut) => {
	// Blue's corner lies past a gap in its constant-hue chroma slice, beyond where
	// the maxChroma bisection stops, so in-gamut colors must be checked directly.
	const [l, c, h] = oklchOf(input)
	// White and black keep only float noise as chroma, which the pole guard zeroes
	const [clampedL, clampedC, clampedH] = clampToGamut(l, c, h, gamut)
	expect(clampedL).toBeCloseTo(l, 6)
	expect(clampedC).toBeCloseTo(c, 6)
	expect(clampedH).toBe(h)
})

it('sheds chroma near black, where an RGB tolerance spans a wide band of chroma', () => {
	for (const l of [0.01, 0.03, 0.05, 0.1]) {
		for (const h of [30, 145, 264]) {
			const frontier = maxChroma(l, h, 'srgb')
			const [, c] = clampToGamut(l, frontier * 1.2, h, 'srgb')
			expect(c).toBeLessThanOrEqual(frontier + 1e-5)
			expect(minimumGamut(l, c, h, ['srgb'])).toBe('srgb')
		}
	}
})

it('clamps a color in the gap beside sRGB blue into the gamut', () => {
	// Just past blue's hue, a thin sliver of sRGB along the black-to-blue edge is
	// detached from the main body. A color between the two is out of gamut, though
	// a bisection from the chroma ceiling can land beyond it on the sliver.
	const [l, , blueHue] = oklchOf('#0000ff')
	const h = blueHue + 0.05
	expect(minimumGamut(l, 0.29, h, ['srgb'])).toBeUndefined()

	const [, c] = clampToGamut(l, 0.29, h, 'srgb')
	expect(c).toBeLessThan(0.29)
	expect(minimumGamut(l, c, h, ['srgb'])).toBe('srgb')
})

it.each(['srgb', 'a98rgb', 'p3', 'rec2020', 'prophoto'])(
	'leaves a color it has clamped into %s unchanged and labeled as inside',
	(gamut) => {
		for (const l of [0.001, 0.01, 0.1, 0.5, 0.9, 0.999]) {
			for (let h = 0; h < 360; h += 15) {
				const once = clampToGamut(l, 0.45, h, gamut)
				expect(clampToGamut(...once, gamut)).toEqual(once)
				expect(minimumGamut(...once, [gamut])).toBe(gamut)
			}
		}
	},
)

it('finds the in-gamut lightness band at a fixed chroma and hue', () => {
	const range = lightnessRange(0.1, 30, 'srgb')
	expect(range).toBeDefined()
	const [lo, hi] = range!
	expect(lo).toBeGreaterThan(0)
	expect(hi).toBeLessThan(1)
	expect(lo).toBeLessThan(hi)

	// Inside the band the gamut holds at least this chroma; just outside it doesn't
	expect(maxChroma((lo + hi) / 2, 30, 'srgb')).toBeGreaterThan(0.1)
	expect(maxChroma(lo + 2e-3, 30, 'srgb')).toBeGreaterThan(0.1)
	expect(maxChroma(hi - 2e-3, 30, 'srgb')).toBeGreaterThan(0.1)
	expect(maxChroma(lo - 2e-3, 30, 'srgb')).toBeLessThan(0.1)
	expect(maxChroma(hi + 2e-3, 30, 'srgb')).toBeLessThan(0.1)

	// A wider gamut holds the chroma over a wider band
	const [p3Lo, p3Hi] = lightnessRange(0.1, 30, 'p3')!
	expect(p3Lo).toBeLessThan(lo)
	expect(p3Hi).toBeGreaterThan(hi)
})

it('reports no lightness band when the chroma exceeds the gamut everywhere', () => {
	expect(lightnessRange(0.45, 30, 'srgb')).toBeUndefined()
})

it('spans the full lightness range at zero chroma', () => {
	expect(lightnessRange(0, 30, 'srgb')).toEqual([0, 1])
	expect(lightnessRange(-0.1, 30, 'srgb')).toEqual([0, 1])

	// The epsilon probe admits a sliver of chroma at the black pole, so the band
	// starts at exactly 0 rather than a bisected edge
	const [lo, hi] = lightnessRange(1e-6, 30, 'srgb')!
	expect(lo).toBe(0)
	expect(hi).toBeGreaterThan(0.999)
	expect(hi).toBeLessThan(1)
})

it('picks the narrowest configured gamut holding a color', () => {
	// Well inside sRGB
	expect(minimumGamut(0.6, 0.1, 30, ['p3', 'srgb'])).toBe('srgb')
	// A green sRGB can't reach but P3 can, whatever the configured order
	expect(minimumGamut(0.6, 0.2, 145, ['p3', 'srgb'])).toBe('p3')
	expect(minimumGamut(0.6, 0.2, 145, ['srgb', 'p3'])).toBe('p3')
	// Without P3 configured the color is out of every gamut
	expect(minimumGamut(0.6, 0.2, 145, ['srgb'])).toBeUndefined()
	expect(minimumGamut(0.6, 0.1, 30, [])).toBeUndefined()
})

it('labels a color picked on the black-to-blue edge as sRGB', () => {
	// P3 shares sRGB's blue primary, so up to sRGB blue's lightness the P3 frontier
	// at blue's hue is sRGB's black-to-blue edge. A pick there takes its chroma
	// from the bisected frontier, which lands within conversion noise of the edge.
	for (const input of ['navy', '#0000ff']) {
		const [l, , h] = oklchOf(input)
		expect(minimumGamut(l, maxChroma(l, h, 'p3'), h, ['srgb', 'p3'])).toBe('srgb')
	}

	// Above sRGB blue's lightness the frontier rises to P3's brighter blue
	const [l, c, h] = oklchOf('color(display-p3 0 0 1)')
	expect(minimumGamut(l, c, h, ['srgb', 'p3'])).toBe('p3')
})

it('labels a color just past the sRGB boundary as P3 at any lightness', () => {
	// Near blue's hue these colors sit ~7e-5 from sRGB in OKLab. Near black they
	// are also within colorjs's RGB tolerance of sRGB, which spans a wide band of
	// OKLCH chroma there.
	for (const l of [0.03, 0.08, 0.3]) {
		const c = maxChroma(l, 264, 'srgb') + 1e-3
		expect(minimumGamut(l, c, 264, ['srgb', 'p3'])).toBe('p3')
	}
})

it('labels Rec2020 blue despite its conversion noise', () => {
	const [l, c, h] = oklchOf('color(rec2020 0 0 1)')
	expect(minimumGamut(l, c, h, ['srgb', 'p3', 'rec2020'])).toBe('rec2020')
})

it('falls back to the first id, or sRGB, when no configured gamut is known', () => {
	expect(widestGamut(['banana'])).toBe('banana')
	expect(widestGamut([])).toBe('srgb')
})

it('returns a stable global max chroma across calls', () => {
	expect(computeGlobalMaxChroma('p3')).toBe(computeGlobalMaxChroma('p3'))
})
