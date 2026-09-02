import { expect, it } from 'vitest'
import type { Channel } from '../src/model/channel.js'
import {
	axisFractionToUnit,
	channelMax,
	LAYOUTS,
	PLANE_LAYOUTS,
	planeBand,
	positionToOklch,
	unitToAxisFraction,
	unitToValue,
	valueToUnit,
} from '../src/model/channel.js'

// Stands in for the widest configured gamut's global maximum chroma
const GLOBAL_MAX_CHROMA = 0.4

it('names every layout as [X][Y]_[slider] over a permutation of the channels', () => {
	expect(Object.keys(LAYOUTS).toSorted()).toEqual([...PLANE_LAYOUTS].toSorted())

	for (const id of PLANE_LAYOUTS) {
		const roles = LAYOUTS[id]
		const [plane, slider] = id.split('_', 2)
		expect(roles.x).toBe(plane![0]!.toLowerCase())
		expect(roles.y).toBe(plane![1]!.toLowerCase())
		expect(roles.slider).toBe(slider!.toLowerCase())
		expect([roles.x, roles.y, roles.slider].toSorted()).toEqual(['c', 'h', 'l'])
	}
})

it('bounds hue and lightness intrinsically and chroma by the widest gamut', () => {
	expect(channelMax('h', GLOBAL_MAX_CHROMA)).toBe(360)
	expect(channelMax('l', GLOBAL_MAX_CHROMA)).toBe(1)
	expect(channelMax('c', GLOBAL_MAX_CHROMA)).toBe(GLOBAL_MAX_CHROMA)
})

it('maps channel values to unit positions and back', () => {
	expect(valueToUnit('h', 180, GLOBAL_MAX_CHROMA)).toBe(0.5)
	expect(valueToUnit('l', 0.25, GLOBAL_MAX_CHROMA)).toBe(0.25)
	expect(valueToUnit('c', 0.1, GLOBAL_MAX_CHROMA)).toBeCloseTo(0.25, 12)

	expect(unitToValue('h', 0.5, GLOBAL_MAX_CHROMA)).toBe(180)
	expect(unitToValue('l', 0.25, GLOBAL_MAX_CHROMA)).toBe(0.25)
	expect(unitToValue('c', 0.25, GLOBAL_MAX_CHROMA)).toBeCloseTo(0.1, 12)

	for (const channel of ['c', 'h', 'l'] as Channel[]) {
		const max = channelMax(channel, GLOBAL_MAX_CHROMA)
		for (const fraction of [0, 0.3, 0.7, 1]) {
			const value = fraction * max
			const unit = valueToUnit(channel, value, GLOBAL_MAX_CHROMA)
			expect(unitToValue(channel, unit, GLOBAL_MAX_CHROMA)).toBeCloseTo(value, 12)
		}
	}
})

it('clamps out-of-range values instead of wrapping hue', () => {
	expect(valueToUnit('h', 360, GLOBAL_MAX_CHROMA)).toBe(1)
	expect(valueToUnit('h', 400, GLOBAL_MAX_CHROMA)).toBe(1)
	expect(valueToUnit('h', -20, GLOBAL_MAX_CHROMA)).toBe(0)
	expect(valueToUnit('l', 1.5, GLOBAL_MAX_CHROMA)).toBe(1)
	expect(unitToValue('l', 2, GLOBAL_MAX_CHROMA)).toBe(1)
	expect(unitToValue('h', -1, GLOBAL_MAX_CHROMA)).toBe(0)
})

it('reads every chroma as the low end when the gamut has no chroma', () => {
	expect(valueToUnit('c', 0.2, 0)).toBe(0)
	expect(unitToValue('c', 1, 0)).toBe(0)
})

it('flips the Y axis between unit positions and screen fractions', () => {
	expect(unitToAxisFraction(0.25, 'x')).toBe(0.25)
	expect(unitToAxisFraction(0.25, 'y')).toBe(0.75)
	expect(axisFractionToUnit(0.25, 'x')).toBe(0.25)
	expect(axisFractionToUnit(0.25, 'y')).toBe(0.75)

	for (const axis of ['x', 'y'] as const) {
		expect(axisFractionToUnit(unitToAxisFraction(0.3, axis), axis)).toBeCloseTo(0.3, 12)
	}
})

it('converts a plane position and slider value to OKLCH per layout', () => {
	// Default layout: chroma across, lightness up, hue on the slider; the top
	// edge is full lightness
	expect(positionToOklch(LAYOUTS.CL_H, 0.5, 0, 200, GLOBAL_MAX_CHROMA)).toEqual([1, 0.2, 200])
	// Bottom-left is black at zero chroma
	expect(positionToOklch(LAYOUTS.CL_H, 0, 1, 200, GLOBAL_MAX_CHROMA)).toEqual([0, 0, 200])
	// Lightness across, chroma up
	expect(positionToOklch(LAYOUTS.LC_H, 0.5, 0, 200, GLOBAL_MAX_CHROMA)).toEqual([0.5, 0.4, 200])
	// Hue on an axis, lightness on the slider
	expect(positionToOklch(LAYOUTS.CH_L, 0.25, 0.5, 0.7, GLOBAL_MAX_CHROMA)).toEqual([0.7, 0.1, 180])
	expect(positionToOklch(LAYOUTS.HC_L, 0.25, 0.5, 0.7, GLOBAL_MAX_CHROMA)).toEqual([0.7, 0.2, 90])
	// Chroma on the slider
	expect(positionToOklch(LAYOUTS.HL_C, 1, 1, 0.3, GLOBAL_MAX_CHROMA)).toEqual([0, 0.3, 360])
	expect(positionToOklch(LAYOUTS.LH_C, 1, 1, 0.3, GLOBAL_MAX_CHROMA)).toEqual([1, 0.3, 0])
})

it('normalizes the chroma axis, or lightness when chroma is on the slider', () => {
	expect(planeBand(LAYOUTS.CL_H)).toEqual({
		bandAxis: 'x',
		bandChannel: 'c',
		iterAxis: 'y',
		iterChannel: 'l',
	})
	expect(planeBand(LAYOUTS.LC_H)).toEqual({
		bandAxis: 'y',
		bandChannel: 'c',
		iterAxis: 'x',
		iterChannel: 'l',
	})
	expect(planeBand(LAYOUTS.CH_L)).toEqual({
		bandAxis: 'x',
		bandChannel: 'c',
		iterAxis: 'y',
		iterChannel: 'h',
	})
	expect(planeBand(LAYOUTS.HC_L)).toEqual({
		bandAxis: 'y',
		bandChannel: 'c',
		iterAxis: 'x',
		iterChannel: 'h',
	})
	// Chroma on the slider: lightness is the single band, hue is never scanned
	expect(planeBand(LAYOUTS.HL_C)).toEqual({
		bandAxis: 'y',
		bandChannel: 'l',
		iterAxis: 'x',
		iterChannel: 'h',
	})
	expect(planeBand(LAYOUTS.LH_C)).toEqual({
		bandAxis: 'x',
		bandChannel: 'l',
		iterAxis: 'y',
		iterChannel: 'h',
	})
})
