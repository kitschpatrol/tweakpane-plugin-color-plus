import { afterEach, expect, it, vi } from 'vitest'
import type { ChannelTextConfig, ColorTextConfig } from '../src/controller/color-texts.js'
import { channelValue, parseColorText, withChannelValue } from '../src/controller/color-texts.js'
import { ColorPlus } from '../src/model/color-plus.js'
import { maxChroma } from '../src/model/gamut.js'
import { spyOnWarnings } from './helpers.js'

afterEach(() => {
	vi.restoreAllMocks()
})

const hex = { alpha: false, format: 'hex', space: 'srgb', type: 'string' } as const

/** A parsed color in the plugin's working representation. */
function color(value: string): ColorPlus {
	const created = ColorPlus.create(value)
	if (created === undefined) {
		throw new Error(`Failed to parse test color "${value}"`)
	}

	created.convert('oklch')
	return created
}

/**
 * The three text-field numbers for a color, rounded past OKLCH round-trip
 * noise.
 */
function channels(value: ColorPlus, config: ChannelTextConfig): number[] {
	return [0, 1, 2].map((index) => Math.round(channelValue(value, config, index) * 100) / 100)
}

const srgbInt: ChannelTextConfig = {
	colorMode: 'srgb',
	colorType: 'int',
	constrain: true,
	gamuts: ['srgb'],
}
const srgbFloat: ChannelTextConfig = { ...srgbInt, colorType: 'float' }
const hslInt: ChannelTextConfig = { ...srgbInt, colorMode: 'hsl' }
const hslFloat: ChannelTextConfig = { ...hslInt, colorType: 'float' }
const oklch: ChannelTextConfig = { ...srgbInt, colorMode: 'oklch' }

it('reads sRGB channels as 0–255 ints or 0–1 floats', () => {
	const c = color('rgb(255 0 102)')
	expect(channels(c, srgbInt)).toEqual([255, 0, 102])
	expect(channels(c, srgbFloat)).toEqual([1, 0, 0.4])
})

it('reads HSL channels in degrees and percent, or as unit floats', () => {
	const c = color('hsl(288 100% 50%)')
	expect(channels(c, hslInt)).toEqual([288, 100, 50])
	expect(channels(c, hslFloat)).toEqual([0.8, 1, 0.5])
})

it('reads the OK modes as raw coordinates regardless of type', () => {
	const c = color('oklch(60% 0.2 30)')
	expect(channels(c, oklch)).toEqual([0.6, 0.2, 30])
	expect(channels(c, { ...oklch, colorType: 'float' })).toEqual([0.6, 0.2, 30])
})

it('writes a channel back without touching the input', () => {
	const c = color('rgb(255 0 102)')
	const before = c.clone()
	const next = withChannelValue(c, srgbInt, 1, 128)

	expect(next).not.toBe(c)
	expect(c.equals(before)).toBe(true)
	expect(channels(next, srgbInt)).toEqual([255, 128, 102])
})

it('round-trips float and OK-mode writes', () => {
	expect(channels(withChannelValue(color('red'), srgbFloat, 2, 0.4), srgbFloat)).toEqual([
		1, 0, 0.4,
	])
	expect(
		channels(withChannelValue(color('hsl(288 100% 50%)'), hslFloat, 1, 0.5), hslFloat),
	).toEqual([0.8, 0.5, 0.5])
	expect(channels(withChannelValue(color('oklch(60% 0.2 30)'), oklch, 1, 0.1), oklch)).toEqual([
		0.6, 0.1, 30,
	])
})

it('constrains a typed OKLCH chroma into the widest configured gamut unless disabled', () => {
	const c = color('oklch(65% 0.1 13)')

	const [l, chroma, h] = withChannelValue(c, oklch, 1, 0.4).getAll('oklch')
	expect(l).toBeCloseTo(0.65, 6)
	expect(h).toBeCloseTo(13, 6)
	expect(chroma).toBeLessThan(0.4)
	expect(chroma).toBeCloseTo(maxChroma(0.65, 13, 'srgb'), 6)

	// A wider gamut admits more chroma
	const wide = withChannelValue(c, { ...oklch, gamuts: ['srgb', 'p3'] }, 1, 0.4)
	expect(wide.getAll('oklch')[1]).toBeCloseTo(maxChroma(0.65, 13, 'p3'), 6)

	const free = withChannelValue(c, { ...oklch, constrain: false }, 1, 0.4)
	expect(free.getAll('oklch')[1]).toBeCloseTo(0.4, 10)
})

const textConfig: ColorTextConfig = { constrain: true, gamuts: ['srgb'], supportsAlpha: true }

it('parses hex field text into OKLCH', () => {
	const parsed = parseColorText('#0080ff', textConfig, 1)!
	expect(parsed.space).toBe('oklch')
	expect(parsed.serialize(hex)).toBe('#0080ff')

	// Any color string the plugin understands is accepted, not only hex
	expect(parseColorText('rgb(0 128 255)', textConfig, 1)!.serialize(hex)).toBe('#0080ff')
})

it('rejects hex field text that is not a color', () => {
	spyOnWarnings()
	expect(parseColorText('bogus', textConfig, 1)).toBeNull()
})

it('takes alpha from the text only when it spells one out and the binding supports it', () => {
	expect(parseColorText('#0080ff', textConfig, 0.5)!.alpha).toBe(0.5)
	expect(parseColorText('#0080ff80', textConfig, 0.5)!.alpha).toBeCloseTo(128 / 255, 6)
	expect(parseColorText('rgb(0 128 255 / 0.25)', textConfig, 0.5)!.alpha).toBe(0.25)
	expect(parseColorText('#0080ff80', { ...textConfig, supportsAlpha: false }, 0.5)!.alpha).toBe(0.5)
})

it('constrains hex field text into the widest configured gamut unless disabled', () => {
	const constrained = parseColorText('oklch(65% 0.4 13)', textConfig, 1)!
	expect(constrained.getAll('oklch')[1]).toBeCloseTo(maxChroma(0.65, 13, 'srgb'), 6)

	const free = parseColorText('oklch(65% 0.4 13)', { ...textConfig, constrain: false }, 1)!
	expect(free.getAll('oklch')[1]).toBeCloseTo(0.4, 10)
})
