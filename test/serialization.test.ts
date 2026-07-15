import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus'
import { formatIsSerializable } from '../src/model/shared'

// Round-trip: parse a string, serialize it back unchanged
const roundTrips: string[] = [
	'#ff0066',
	'#ff00667f',
	'#f06', // Expands
	'hsl(336 100% 50%)',
	'hsl(336deg 100% 50% / 0.5)',
	'hsla(336 100% 50% / 0.5)',
	'hwb(336 0% 0%)',
	'lab(55% 83 21)',
	'lch(55 85 14)',
	'oklab(0.64 0.25 0.05)',
	'oklch(60% 0.26 11deg)',
	'oklch(60% 0.26 11deg / 0.5)',
	'rgb(255 0 102)',
	'rgb(255, 0, 102)',
	'rgba(255, 0, 102, 0.5)',
	'color(display-p3 0.92 0.2 0.41)',
	'color(a98-rgb 0.86 0 0.39)',
	'color(prophoto-rgb 0.72 0.28 0.33)',
	'color(rec2020 0.8 0.23 0.35)',
	'color(srgb-linear 1 0 0.13)',
	'color(xyz-d65 0.44 0.22 0.15)', // Plain xyz normalizes to xyz-d65
	'color(--hsv 336 100% 100)',
]

it('round-trips string formats through parse and serialize', () => {
	for (const value of roundTrips) {
		const color = ColorPlus.create(value)
		const format = ColorPlus.getFormat(value)
		expect(color, value).toBeDefined()
		expect(format, value).toBeDefined()
		const serialized = color!.serialize(format!)
		expect(serialized, value).toBe(value.startsWith('#f06') ? '#ff0066' : value)
	}
})

it('reports keyword formats as unserializable', () => {
	const format = ColorPlus.getFormat('rebeccapurple')
	expect(format).toBeDefined()
	expect(formatIsSerializable(format!)).toBe(false)
})

it('serializes hex without collapsing', () => {
	const color = ColorPlus.create('#fff')
	const format = ColorPlus.getFormat('#fff')
	expect(color!.serialize(format!)).toBe('#ffffff')
})
