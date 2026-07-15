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
