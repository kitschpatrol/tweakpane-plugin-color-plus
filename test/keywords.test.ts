import { expect, it } from 'vitest'
// Registers the colorjs color spaces by side effect
import '../src/model/shared.js'
import { ColorPlus } from '../src/model/color-plus.js'
import { nearestKeywordOklch, nearestKeywordSrgb } from '../src/model/keywords.js'

function oklch(value: string): [number, number, number] {
	const [l, c, h] = ColorPlus.create(value)!.getAll('oklch')
	return [l!, c!, h!]
}

it('returns the nearest named color in OKLCH and sRGB', () => {
	// One off rebeccapurple's #663399
	const [l, c, h] = oklch('#663398')
	const [rl, rc, rh] = oklch('rebeccapurple')

	const nearestOklch = nearestKeywordOklch(l, c, h)
	expect(nearestOklch[0]).toBeCloseTo(rl, 10)
	expect(nearestOklch[1]).toBeCloseTo(rc, 10)
	expect(nearestOklch[2]).toBeCloseTo(rh, 10)

	const nearestSrgb = nearestKeywordSrgb(l, c, h)
	expect(nearestSrgb[0]).toBeCloseTo(0.4, 10)
	expect(nearestSrgb[1]).toBeCloseTo(0.2, 10)
	expect(nearestSrgb[2]).toBeCloseTo(0.6, 10)
})

it('returns an exact named color unchanged', () => {
	const [l, c, h] = oklch('red')
	expect(nearestKeywordSrgb(l, c, h)).toEqual([1, 0, 0])
	const nearestOklch = nearestKeywordOklch(l, c, h)
	expect(nearestOklch[0]).toBeCloseTo(l, 10)
	expect(nearestOklch[1]).toBeCloseTo(c, 10)
	expect(nearestOklch[2]).toBeCloseTo(h, 10)
})

it('treats a missing hue as achromatic', () => {
	// A gray has a powerless hue, which colorjs may report as NaN
	const gray = nearestKeywordSrgb(0.6, 0, NaN)
	expect(gray).toEqual(nearestKeywordSrgb(0.6, 0, 0))
	expect(gray[0]).toBe(gray[1])
	expect(gray[1]).toBe(gray[2])
	expect(nearestKeywordOklch(0.6, 0, NaN)).toEqual(nearestKeywordOklch(0.6, 0, 0))
	// A missing chroma reads as zero rather than poisoning the distance
	expect(nearestKeywordSrgb(0.6, NaN, 30)).toEqual(gray)
})
