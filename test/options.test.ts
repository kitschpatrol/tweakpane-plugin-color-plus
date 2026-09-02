import { afterEach, expect, it, vi } from 'vitest'
import type { ColorPlusInputParams } from '../src/plugin.js'
import type { ColorTextsMode } from '../src/view/color-texts.js'
import { ColorPlus } from '../src/model/color-plus.js'
import {
	defaultsForFormat,
	parseColorInputParams,
	resolveGamuts,
	textsModeForFormat,
	validateColorInputParams,
} from '../src/utilities.js'
import { spyOnWarnings } from './helpers.js'

afterEach(() => {
	vi.restoreAllMocks()
})

it('parses the supported binding params', () => {
	expect(
		parseColorInputParams({
			color: { alpha: true, formatLocked: false, type: 'float' },
			constrain: false,
			expanded: true,
			gamutLabel: false,
			gamutLines: 'outer',
			gamuts: ['srgb', 'display-p3'],
			paletteChannels: 'lc_h',
			paletteProjection: 'perceptual',
			picker: 'inline',
			swatchFallback: 'css',
			textFields: false,
			view: 'color-plus',
		}),
	).toEqual({
		color: { alpha: true, formatLocked: false, type: 'float' },
		constrain: false,
		expanded: true,
		gamutLabel: false,
		gamutLines: 'outer',
		gamuts: ['srgb', 'p3'],
		paletteChannels: 'LC_H',
		paletteProjection: 'perceptual',
		picker: 'inline',
		swatchFallback: 'css',
		textFields: false,
	})
})

it('leaves omitted params undefined for the plugin to default', () => {
	const parsed = parseColorInputParams({ view: 'color-plus' })
	expect(parsed).toBeDefined()
	expect(Object.values(parsed!).every((value) => value === undefined)).toBe(true)
})

it('rejects unrecognized option values, like the built-in inputs', () => {
	const cases: Array<Record<string, unknown>> = [
		{ color: { type: 'double' } },
		{ gamutLines: 'dotted' },
		{ gamuts: ['srgb', 'banana'] },
		{ paletteChannels: 'XY_Z' },
		{ paletteChannels: 42 },
		{ paletteProjection: 'fisheye' },
		{ picker: 'modal' },
		{ swatchFallback: 'nearest' },
	]
	for (const params of cases) {
		expect(parseColorInputParams({ ...params, view: 'color-plus' })).toBeUndefined()
	}
})

it('rejects params of the wrong shape', () => {
	// Wrong primitive types and readonly bindings fail the record parse too
	expect(parseColorInputParams({ constrain: 'yes', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ gamuts: 'srgb', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ readonly: true, view: 'color-plus' })).toBeUndefined()
})

it('normalizes gamut aliases while parsing', () => {
	expect(
		parseColorInputParams({ gamuts: ['Display-P3', 'srgb', 'A98-RGB', 'p3'], view: 'color-plus' })
			?.gamuts,
	).toEqual(['p3', 'srgb', 'a98rgb', 'p3'])
})

it('deduplicates configured gamuts and falls back to a copy of the defaults', () => {
	expect(resolveGamuts(['p3', 'srgb', 'p3'], ['srgb'])).toEqual(['p3', 'srgb'])

	const fallback = ['srgb', 'p3']
	for (const gamuts of [undefined, []]) {
		const result = resolveGamuts(gamuts, fallback)
		expect(result).toEqual(fallback)
		expect(result).not.toBe(fallback)
	}
})

it('adapts defaults to the gamut reach of the bound color model', () => {
	const srgbBound = [
		'#ff0066',
		'red',
		'rgb(255 0 102)',
		'hsl(336 100% 50%)',
		'hwb(336 0% 0%)',
		'color(--hsv 336 100% 100)',
		'color(srgb-linear 1 0 0.13)',
		0xff_00_66,
		[255, 0, 102],
		{ h: 336, s: 100, l: 50 },
	]
	for (const value of srgbBound) {
		expect(defaultsForFormat(ColorPlus.getFormat(value)!)).toEqual({
			gamutLabel: false,
			gamuts: ['srgb'],
			textsMode: 'hsv',
		})
	}

	const wide = [
		'oklch(60% 0.26 11deg)',
		'lab(55% 83 21)',
		'color(display-p3 0.92 0.2 0.41)',
		'color(xyz-d65 0.44 0.22 0.15)',
		{ l: 55, c: 85, h: 14 },
	]
	for (const value of wide) {
		expect(defaultsForFormat(ColorPlus.getFormat(value)!)).toEqual({
			gamutLabel: true,
			gamuts: ['srgb', 'p3'],
			textsMode: 'oklch',
		})
	}
})

it('picks the texts mode matching the bound model', () => {
	const cases: Array<[unknown, ColorTextsMode]> = [
		['#ff0066', 'hex'],
		['red', 'hex'],
		[0xff_00_66, 'hex'],
		['rgb(255 0 102)', 'srgb'],
		[[255, 0, 102], 'srgb'],
		[{ r: 255, g: 0, b: 102 }, 'srgb'],
		['hsl(336 100% 50%)', 'hsl'],
		[{ h: 336, s: 100, l: 50 }, 'hsl'],
		['color(--hsv 336 100% 100)', 'hsv'],
		[{ h: 336, s: 100, v: 100 }, 'hsv'],
		['color(--okhsv 336 100% 100%)', 'okhsv'],
		['oklch(60% 0.26 11deg)', 'oklch'],
		// Models without a mode of their own take the adaptive default
		['hwb(336 0% 0%)', 'hsv'],
		['lab(55% 83 21)', 'oklch'],
		['color(display-p3 0.92 0.2 0.41)', 'oklch'],
	]
	for (const [value, mode] of cases) {
		expect(textsModeForFormat(ColorPlus.getFormat(value)!)).toBe(mode)
	}
})

it('drops option combinations that do not apply to the bound value type', () => {
	const warn = spyOnWarnings()

	// Alpha mode is number-only
	const alphaOnString: ColorPlusInputParams = { color: { alpha: true } }
	validateColorInputParams(alphaOnString, '#ff0066')
	expect(alphaOnString.color?.alpha).toBeUndefined()
	const alphaOnNumber: ColorPlusInputParams = { color: { alpha: true } }
	validateColorInputParams(alphaOnNumber, 0xff_00_66)
	expect(alphaOnNumber.color?.alpha).toBe(true)

	// Float mode is object- and array-only
	const floatOnString: ColorPlusInputParams = { color: { type: 'float' } }
	validateColorInputParams(floatOnString, '#ff0066')
	expect(floatOnString.color?.type).toBe('int')
	const floatOnObject: ColorPlusInputParams = { color: { type: 'float' } }
	validateColorInputParams(floatOnObject, { r: 1, g: 0, b: 0.4 })
	expect(floatOnObject.color?.type).toBe('float')
	const floatOnTuple: ColorPlusInputParams = { color: { type: 'float' } }
	validateColorInputParams(floatOnTuple, [1, 0, 0.4])
	expect(floatOnTuple.color?.type).toBe('float')

	expect(warn).toHaveBeenCalledTimes(2)
})
