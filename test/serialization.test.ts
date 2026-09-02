import { afterEach, expect, it, vi } from 'vitest'
import type { ObjectColorFormat } from '../src/model/shared'
import { ColorPlus } from '../src/model/color-plus'
import { colorToObject, colorToObjectString } from '../src/model/object'
import { formatIsSerializable } from '../src/model/shared'
import { colorToString } from '../src/model/string'
import { spyOnWarnings } from './helpers.js'

afterEach(() => {
	vi.restoreAllMocks()
})

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
	// Percentages and missing channels keep their notation
	'rgb(100% 0% 40%)',
	'rgb(none 0 102)',
	'hsl(none 50% 50%)',
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

it('clamps out-of-range channels when packing numbers', () => {
	// Slightly outside sRGB, as after an edit with constrain off. Without
	// clamping, the negative green bleeds into the other bytes
	const format = ColorPlus.getFormat(0xff_00_66)!
	expect(ColorPlus.create('rgb(254.76 -0.96 101.82)')!.toValue(format)).toBe(0xff_00_66)
	expect(ColorPlus.create('rgb(300 0 0)')!.toValue(format)).toBe(0xff_00_00)
	expect(ColorPlus.create('rgb(0 -50 0)')!.toValue(format)).toBe(0x00_00_00)

	const alphaFormat = ColorPlus.getFormat(0xff_00_66_7f, true)!
	expect(ColorPlus.create('rgb(300 -1 102 / 0.5)')!.toValue(alphaFormat)).toBe(0xff_00_66_80)
})

it('round-trips every channel and alpha byte through numbers', () => {
	const format = ColorPlus.getFormat(0, true)!
	for (let byte = 0; byte < 256; byte++) {
		// The byte in every position: 0x01010101 * byte
		const value = byte * 0x01_01_01_01
		expect(ColorPlus.create(value, true)!.toValue(format)).toBe(value)
	}
})

it('writes int object and tuple channels as whole numbers', () => {
	// A picker edit leaves the model on fractional channels; alpha is untouched
	const edited = ColorPlus.create('rgb(254.76 0.4 101.82 / 0.4980392)')!

	const objectFormat = ColorPlus.getFormat({ r: 255, g: 0, b: 102, a: 0.5 })!
	expect(edited.toValue(objectFormat)).toEqual({ r: 255, g: 0, b: 102, a: 0.4980392 })

	const tupleFormat = ColorPlus.getFormat([255, 0, 102, 0.5])!
	expect(edited.toValue(tupleFormat)).toEqual([255, 0, 102, 0.4980392])

	// Native-unit spaces round too, matching the text-field display
	const hslFormat = ColorPlus.getFormat({ h: 336, s: 100, l: 50 })!
	expect(ColorPlus.create('hsl(335.6 99.7% 50.2%)')!.toValue(hslFormat)).toEqual({
		h: 336,
		s: 100,
		l: 50,
	})

	// Out-of-range channels round but aren't clamped, like the string formats
	expect(ColorPlus.create('rgb(300 -1.4 102)')!.toValue(objectFormat)).toEqual({
		r: 300,
		g: -1,
		b: 102,
		a: 1,
	})
})

it('keeps float object and tuple channels exact', () => {
	const edited = ColorPlus.create('rgb(254.76 0.4 101.82)')!

	const objectFormat = ColorPlus.getFormat({ r: 1, g: 0, b: 0.4 }, undefined, 'float')!
	const object = edited.toValue(objectFormat) as Record<string, number>
	expect(object.r).toBeCloseTo(254.76 / 255, 12)
	expect(object.g).toBeCloseTo(0.4 / 255, 12)
	expect(object.b).toBeCloseTo(101.82 / 255, 12)

	const tupleFormat = ColorPlus.getFormat([1, 0, 0.4], undefined, 'float')!
	const tuple = edited.toValue(tupleFormat) as number[]
	expect(tuple[0]).toBeCloseTo(254.76 / 255, 12)
	expect(tuple[1]).toBeCloseTo(0.4 / 255, 12)
	expect(tuple[2]).toBeCloseTo(101.82 / 255, 12)
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

it('serializes object and tuple formats as display strings', () => {
	const color = ColorPlus.create('#ff006680')!
	expect(color.serialize(ColorPlus.getFormat({ r: 0, g: 0, b: 0 })!)).toBe('{r: 255, g: 0, b: 102}')
	expect(color.serialize(ColorPlus.getFormat({ r: 0, g: 0, b: 0, a: 1 })!)).toBe(
		'{r: 255, g: 0, b: 102, a: 0.502}',
	)
	expect(color.serialize(ColorPlus.getFormat({ r: 0, g: 0, b: 0 }, undefined, 'float')!)).toBe(
		'{r: 1.000, g: 0.000, b: 0.400}',
	)
	expect(color.serialize(ColorPlus.getFormat([0, 0, 0])!)).toBe('[255, 0, 102]')
	expect(color.serialize(ColorPlus.getFormat([0, 0, 0, 1])!)).toBe('[255, 0, 102, 0.502]')
	expect(color.serialize(ColorPlus.getFormat([0, 0, 0], undefined, 'float')!)).toBe(
		'[1.000, 0.000, 0.400]',
	)

	// The override adds or drops alpha regardless of the format
	expect(color.serialize(ColorPlus.getFormat([0, 0, 0])!, true)).toBe('[255, 0, 102, 0.502]')
	expect(color.serialize(ColorPlus.getFormat({ r: 0, g: 0, b: 0, a: 1 })!, false)).toBe(
		'{r: 255, g: 0, b: 102}',
	)
})

it('writes native-unit float object channels in 0-1', () => {
	const hslFormat = ColorPlus.getFormat({ h: 0, s: 0, l: 0 }, undefined, 'float')!
	const color = ColorPlus.create('#ff0066')!
	expect(color.serialize(hslFormat)).toBe('{h: 0.933, s: 1.000, l: 0.500}')

	const value = color.toValue(hslFormat) as Record<string, number>
	expect(value.h).toBeCloseTo(336 / 360, 10)
	expect(value.s).toBeCloseTo(1, 10)
	expect(value.l).toBeCloseTo(0.5, 10)
})

it('writes null channels as null in objects and tuples, and as zero bytes in numbers', () => {
	const tuple = ColorPlus.create([null, 0, 102])!
	expect(tuple.toValue(ColorPlus.getFormat([0, 0, 0])!)).toEqual([null, 0, 102])
	expect(tuple.serialize(ColorPlus.getFormat([0, 0, 0])!)).toBe('[null, 0, 102]')
	expect(tuple.toValue(ColorPlus.getFormat(0)!)).toBe(0x00_00_66)
	expect(tuple.serialize(ColorPlus.getFormat(0)!)).toBe('0x000066')

	const object = ColorPlus.create({ r: null, g: 0, b: 102 })!
	const objectFormat = ColorPlus.getFormat({ r: 0, g: 0, b: 0 })!
	expect(object.toValue(objectFormat)).toEqual({ r: null, g: 0, b: 102 })
	expect(object.serialize(objectFormat)).toBe('{r: null, g: 0, b: 102}')
})

it('refuses object conversion for spaces without an object shape', () => {
	const warn = spyOnWarnings()
	const format: ObjectColorFormat = {
		alpha: false,
		format: { alphaKey: undefined, colorType: 'int', coordKeys: ['l', 'c', 'h'] },
		space: 'oklch',
		type: 'object',
	}
	const color = ColorPlus.create('#ff0066')!.toJSON()
	expect(colorToObject(color, format)).toBeUndefined()
	expect(colorToObjectString(color, format)).toBeUndefined()
	expect(warn).toHaveBeenCalledWith('Invalid color space for object conversion: oklch')
})

it('requires parse metadata to serialize CSS strings', () => {
	const warn = spyOnWarnings()
	const bareFormat = { alpha: false, format: 'hex', space: 'srgb', type: 'string' } as const
	expect(colorToString(ColorPlus.create('#ff0066')!.toJSON(), bareFormat)).toBeUndefined()
	expect(warn).toHaveBeenCalledWith('Invalid format type')

	// The generic serializer handles bare format ids instead
	expect(ColorPlus.create('#ff0066')!.serialize(bareFormat)).toBe('#ff0066')
})

it('serializes keywords through bare format ids, with alpha only when asked', () => {
	const transparent = ColorPlus.create('rgb(0 0 0 / 0)')!
	expect(
		transparent.serialize({ alpha: true, format: 'keyword', space: 'srgb', type: 'string' }),
	).toBe('transparent')
	expect(
		transparent.serialize({ alpha: false, format: 'keyword', space: 'srgb', type: 'string' }),
	).toBe('black')
})

it('keeps the notation of a channel parsed as none once it holds a number', () => {
	// The untyped slot would otherwise serialize as a percentage, unlike its
	// siblings
	const format = ColorPlus.getFormat('rgb(none 0 102)')!
	expect(ColorPlus.create('rgb(254.76 0.4 101.82)')!.serialize(format)).toBe('rgb(255 0 102)')

	// A channel that is still missing stays none, and the others still round
	expect(
		ColorPlus.create('rgb(none 127.46 300.2)')!.serialize(ColorPlus.getFormat('rgb(0 0 0)')!),
	).toBe('rgb(none 127 300)')

	// A slot whose grammar shares no type with its siblings keeps the colorjs
	// default
	expect(
		ColorPlus.create('hsl(180 50% 50%)')!.serialize(ColorPlus.getFormat('hsl(none 50% 50%)')!),
	).toBe('hsl(180 50% 50%)')
})
