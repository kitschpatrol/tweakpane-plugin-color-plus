import { afterEach, expect, it, vi } from 'vitest'
import type { ColorPlusObject, ColorSpaceId } from '../src/model/shared.js'
import {
	convert,
	denormalizeCoord,
	formatNumber,
	getRangeForChannel,
	normalizeCoord,
	serialize,
	toDecimalPrecision,
} from '../src/model/shared.js'
import { spyOnWarnings } from './helpers.js'

afterEach(() => {
	vi.restoreAllMocks()
})

function srgb(r: number, g: number, b: number): ColorPlusObject {
	return { alpha: 1, coords: [r, g, b], spaceId: 'srgb' }
}

it('returns undefined when no conversion is needed', () => {
	expect(convert(srgb(1, 0, 0), 'srgb')).toBeUndefined()
})

it('converts into a new object, leaving the source coordinates alone', () => {
	const red = srgb(1, 0, 0)
	const converted = convert(red, 'hsl')!
	expect(converted).not.toBe(red)
	expect(converted.spaceId).toBe('hsl')
	expect(converted.coords[0]).toBeCloseTo(0, 6)
	expect(converted.coords[1]).toBeCloseTo(100, 6)
	expect(converted.coords[2]).toBeCloseTo(50, 6)
	// Colorjs caches the resolved space on the source, but never its values
	expect(red).toMatchObject({ alpha: 1, coords: [1, 0, 0], spaceId: 'srgb' })
})

it('pins the hue of achromatic HSL and HSV conversions to the last hue', () => {
	// Rounding error would otherwise hand grays a random hue
	const gray = convert(srgb(0.5, 0.5, 0.5), 'hsl', 123)!
	expect(gray.coords[0]).toBe(123)
	expect(gray.coords[1]).toBe(0)
	expect(gray.coords[2]).toBeCloseTo(50, 6)

	// Black has zero lightness as well as zero saturation
	const black = convert(srgb(0, 0, 0), 'hsl', 123)!
	expect(black.coords).toEqual([123, 0, 0])

	const white = convert(srgb(1, 1, 1), 'hsv', 45)!
	expect(white.coords[0]).toBe(45)
	expect(white.coords[1]).toBe(0)
	expect(white.coords[2]).toBeCloseTo(100, 6)

	// The default last hue is zero
	expect(convert(srgb(0.5, 0.5, 0.5), 'hsl')!.coords[0]).toBe(0)
})

it('pins the hue of achromatic polar perceptual conversions to the last hue', () => {
	const oklch = convert(srgb(0.5, 0.5, 0.5), 'oklch', 200)!
	expect(oklch.coords[1]).toBe(0)
	expect(oklch.coords[2]).toBe(200)

	const lch = convert(srgb(0.5, 0.5, 0.5), 'lch', 200)!
	expect(lch.coords[1]).toBe(0)
	expect(lch.coords[2]).toBe(200)
})

it('leaves the hue of chromatic conversions alone', () => {
	expect(convert(srgb(1, 0, 0), 'hsl', 123)!.coords[0]).toBeCloseTo(0, 6)
	expect(convert(srgb(1, 0, 0), 'oklch', 123)!.coords[2]).toBeCloseTo(29.2338802796, 6)
})

it('serializes bare colorjs format ids', () => {
	expect(
		serialize(srgb(1, 0, 0), { alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#ff0000')
})

it('refuses to serialize formats without a colorjs format id', () => {
	const warn = spyOnWarnings()
	expect(
		serialize(srgb(1, 0, 0), { alpha: false, format: {}, space: 'srgb', type: 'number' }),
	).toBeUndefined()
	expect(warn).toHaveBeenCalledWith('Invalid format type')
})

it('reads channel ranges from the registered color spaces', () => {
	expect(getRangeForChannel('hsl', 0)).toEqual([0, 360])
	expect(getRangeForChannel('hsl', 1)).toEqual([0, 100])
	expect(getRangeForChannel('srgb', 2)).toEqual([0, 1])
	// Unbounded spaces fall back to their reference range
	expect(getRangeForChannel('xyz-d65', 0)).toEqual([0, 1])
})

it('throws for unknown spaces and channels', () => {
	const warn = spyOnWarnings()
	expect(() => getRangeForChannel('bogus' as ColorSpaceId, 0)).toThrow('Unknown color space: bogus')
	expect(warn).toHaveBeenCalledWith('Unknown color space: bogus')
	expect(() => getRangeForChannel('srgb', 5)).toThrow('Unknown range for channel: 5')
})

it('rounds to a number of decimal places', () => {
	expect(toDecimalPrecision(1.23456, 2)).toBe(1.23)
	expect(toDecimalPrecision(10.9999, 1)).toBe(11)
	expect(toDecimalPrecision(123.456, 0)).toBe(123)
	expect(toDecimalPrecision(-2.5, 0)).toBe(-2)
})

it('passes numbers through when the precision or number is unusable', () => {
	expect(toDecimalPrecision(1.23456, undefined)).toBe(1.23456)
	expect(toDecimalPrecision(1.23456, -1)).toBe(1.23456)
	expect(toDecimalPrecision(1.23456, 1.5)).toBe(1.23456)
	expect(toDecimalPrecision(NaN, 2)).toBeNaN()
	expect(toDecimalPrecision(Infinity, 2)).toBe(Infinity)
})

it('formats numbers with a clamped digit count', () => {
	expect(formatNumber(1.23456, undefined)).toBe('1.23456')
	expect(formatNumber(1.23456, 3)).toBe('1.235')
	expect(formatNumber(1.5, 0)).toBe('2')
	expect(formatNumber(1.5, -2)).toBe('2')
	expect(formatNumber(1, 25)).toBe('1.00000000000000000000')
})

it('maps channel values to unit ranges and back', () => {
	expect(normalizeCoord('hsl', 0, 180)).toBe(0.5)
	expect(normalizeCoord('hsl', 1, 25)).toBe(0.25)
	expect(normalizeCoord('srgb', 0, 0.5)).toBe(0.5)
	expect(denormalizeCoord('hsl', 0, 0.5)).toBe(180)
	expect(denormalizeCoord('hsl', 1, 0.25)).toBe(25)
	expect(denormalizeCoord('hsl', 0, normalizeCoord('hsl', 0, 123))).toBeCloseTo(123, 10)
	expect(normalizeCoord('hsl', 0, null)).toBeNull()
	expect(denormalizeCoord('hsl', 0, null)).toBeNull()
})
