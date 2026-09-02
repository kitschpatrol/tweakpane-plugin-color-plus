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
	'red',
	'rebeccapurple',
	'transparent',
	// Out of gamut: colorjs would map these by default, but gamut handling is
	// the plugin's job, so the string reflects the model
	'rgb(0 128 300)',
	'hsl(230 180% 37%)',
	'color(display-p3 1.2 0 0)',
]

it.each(roundTrips)('round-trips %s through parse and serialize', (value) => {
	const color = ColorPlus.create(value)
	const format = ColorPlus.getFormat(value)

	expect(color).toBeDefined()
	expect(format).toBeDefined()

	const serialized = color!.serialize(format!)
	expect(serialized).toBe(value.startsWith('#f06') ? '#ff0066' : value)
})

it('reports keyword formats as serializable', () => {
	const format = ColorPlus.getFormat('rebeccapurple')
	expect(format).toBeDefined()
	expect(formatIsSerializable(format!)).toBe(true)
})

it('serializes keyword colors as lowercase names', () => {
	const color = ColorPlus.create('RebeccaPurple')
	const format = ColorPlus.getFormat('RebeccaPurple')
	expect(color!.serialize(format!)).toBe('rebeccapurple')
})

it('snaps to the nearest keyword when serializing', () => {
	const format = ColorPlus.getFormat('red')
	// One off rebeccapurple's #663399
	const color = ColorPlus.create('#663398')
	expect(color!.serialize(format!)).toBe('rebeccapurple')
})

it('breaks exact keyword ties by CSS table order', () => {
	const format = ColorPlus.getFormat('red')!
	expect(ColorPlus.create('#00ffff')!.serialize(format)).toBe('aqua')
	expect(ColorPlus.create('#ff00ff')!.serialize(format)).toBe('fuchsia')
	expect(ColorPlus.create('#808080')!.serialize(format)).toBe('gray')
})

it('ignores alpha when serializing keyword formats without alpha', () => {
	// Plain names carry no alpha, so translucency isn't representable
	const format = ColorPlus.getFormat('red')!
	const color = ColorPlus.create('rgb(255 0 0 / 0.5)')!
	expect(color.serialize(format)).toBe('red')
})

it('serializes zero alpha as transparent when the format has alpha', () => {
	const format = ColorPlus.getFormat('transparent')!
	expect(ColorPlus.create('rgb(255 0 0 / 0)')!.serialize(format)).toBe('transparent')
	// Only exactly zero alpha reads as transparent
	expect(ColorPlus.create('rgb(255 0 0 / 0.3)')!.serialize(format)).toBe('red')
	expect(ColorPlus.create('rgb(255 0 0)')!.serialize(format)).toBe('red')
})

it('round-trips number colors with leading zero bytes', () => {
	for (const value of [0x00_00_ff, 0x00_ff_ff, 0x00_ff_00, 0xff_00_66]) {
		const color = ColorPlus.create(value)!
		const format = ColorPlus.getFormat(value)!
		expect(color.toValue(format)).toBe(value)
		expect(color.serialize(format)).toBe(`0x${value.toString(16).padStart(6, '0')}`)
	}

	for (const value of [0x00_ff_00_ff, 0x00_00_ff_80, 0xff_00_66_7f]) {
		const color = ColorPlus.create(value, true)!
		const format = ColorPlus.getFormat(value, true)!
		expect(color.toValue(format)).toBe(value)
		expect(color.serialize(format)).toBe(`0x${value.toString(16).padStart(8, '0')}`)
	}
})

it('gamut-maps out-of-gamut colors when serializing to hex', () => {
	// Hex can't express out-of-range channels, so colorjs's hex format maps
	// regardless of the serializer's inGamut option
	const format = ColorPlus.getFormat('#000000')!
	expect(ColorPlus.create('rgb(0 128 300)')!.serialize(format)).toBe('#3888ff')
})

it('serializes hex without collapsing', () => {
	const color = ColorPlus.create('#fff')
	const format = ColorPlus.getFormat('#fff')
	expect(color!.serialize(format!)).toBe('#ffffff')
})
