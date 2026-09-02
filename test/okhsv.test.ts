import { expect, it } from 'vitest'
// Registers the colorjs color spaces (oklch, srgb, p3, rec2020, ...) by side effect
import '../src/model/shared.js'
import { maxChroma } from '../src/model/gamut.js'
import {
	buildOkhsvProfile,
	lightnessChromaToOkhsv,
	okhsvToLightnessChroma,
} from '../src/model/okhsv.js'

it('round-trips saturation/value through a hue profile', () => {
	const profile = buildOkhsvProfile(30, 'srgb')
	const cases: Array<[number, number]> = [
		[0.3, 0.8],
		[1, 1],
		[0, 1],
		[0.5, 0.5],
	]
	for (const [s, v] of cases) {
		const [l, c] = okhsvToLightnessChroma(profile, s, v)
		const [s2, v2] = lightnessChromaToOkhsv(profile, l, c)
		expect(s2).toBeCloseTo(s, 6)
		expect(v2).toBeCloseTo(v, 6)
	}
})

it('maps a fixed saturation/value to (near) in-gamut coordinates at any hue', () => {
	// A hue-slider ride holds (s, v) and re-derives (l, c) per hue. The profile
	// boundary is piecewise linear, so it may overshoot the true frontier by a
	// rounding step — the controller clamps that off — but never by more.
	for (let hue = 0; hue < 360; hue += 30) {
		const profile = buildOkhsvProfile(hue, 'srgb')
		const [l, c] = okhsvToLightnessChroma(profile, 0.9, 0.95)
		expect(c - maxChroma(l, hue, 'srgb')).toBeLessThan(2e-3)
	}
})

it('reuses a profile for the same hue and gamut', () => {
	expect(buildOkhsvProfile(30, 'srgb')).toBe(buildOkhsvProfile(30, 'srgb'))
	expect(buildOkhsvProfile(30, 'srgb')).not.toBe(buildOkhsvProfile(30, 'p3'))
})

it('bounds the profile cache so a continuous hue drag cannot grow it', () => {
	const first = buildOkhsvProfile(0.5, 'srgb')
	for (let hue = 1.5; hue < 11; hue += 1) {
		buildOkhsvProfile(hue, 'srgb')
	}

	// Evicted, so a rebuild returns a fresh profile with the same shape
	const rebuilt = buildOkhsvProfile(0.5, 'srgb')
	expect(rebuilt).not.toBe(first)
	expect(rebuilt.cuspChroma).toBe(first.cuspChroma)
	expect(rebuilt.cuspLightness).toBe(first.cuspLightness)
})

it('describes the gamut slice: zero chroma at the poles, the cusp between', () => {
	const profile = buildOkhsvProfile(30, 'srgb')
	expect(profile.chromaByLightness[0]).toBe(0)
	expect(profile.chromaByLightness.at(-1)).toBe(0)
	expect(profile.cuspLightness).toBeGreaterThan(0)
	expect(profile.cuspLightness).toBeLessThan(1)
	expect(profile.cuspChroma).toBeCloseTo(maxChroma(profile.cuspLightness, 30, 'srgb'), 10)
	expect(profile.saturationMax).toBeCloseTo(profile.cuspChroma / profile.cuspLightness, 10)
})

it('maps the corners to black, white, and the cusp', () => {
	const profile = buildOkhsvProfile(30, 'srgb')
	expect(okhsvToLightnessChroma(profile, 0, 0)).toEqual([0, 0])

	const [whiteL, whiteC] = okhsvToLightnessChroma(profile, 0, 1)
	expect(whiteL).toBeCloseTo(1, 6)
	expect(whiteC).toBeCloseTo(0, 6)

	const [cuspL, cuspC] = okhsvToLightnessChroma(profile, 1, 1)
	expect(cuspL).toBeCloseTo(profile.cuspLightness, 4)
	expect(cuspC).toBeCloseTo(profile.cuspChroma, 4)
})

it('clamps saturation and value into the unit square', () => {
	const profile = buildOkhsvProfile(30, 'srgb')
	expect(okhsvToLightnessChroma(profile, 2, 3)).toEqual(okhsvToLightnessChroma(profile, 1, 1))
	expect(okhsvToLightnessChroma(profile, -1, -1)).toEqual([0, 0])

	// Chroma beyond the cusp ray saturates rather than overshooting
	const [s, v] = lightnessChromaToOkhsv(profile, 0.5, 1)
	expect(s).toBe(1)
	expect(v).toBeLessThanOrEqual(1)
})

it('reads black and negative chroma as achromatic', () => {
	const profile = buildOkhsvProfile(30, 'srgb')
	expect(lightnessChromaToOkhsv(profile, 0, 0)).toEqual([0, 0])
	expect(lightnessChromaToOkhsv(profile, 0.5, -0.1)).toEqual([0, 0.5])
})
