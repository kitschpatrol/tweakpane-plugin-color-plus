import { afterEach, expect, it, vi } from 'vitest'
import type { ColorTextsMode } from '../src/view/color-texts.js'
import { ColorPlus } from '../src/model/color-plus.js'
import {
	defaultsForFormat,
	normalizeGamuts,
	parseColorInputParams,
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
		gamuts: ['srgb', 'display-p3'],
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

it('falls back with a warning for unknown palette and gamut-line options', () => {
	const warn = spyOnWarnings()
	const parsed = parseColorInputParams({
		gamutLines: 'dotted',
		paletteChannels: 'XY_Z',
		paletteProjection: 'fisheye',
		view: 'color-plus',
	})
	expect(parsed).toMatchObject({
		gamutLines: 'inner',
		paletteChannels: 'CL_H',
		paletteProjection: 'okhsv',
	})
	expect(warn).toHaveBeenCalledTimes(3)
})

it('rejects params of the wrong shape', () => {
	// Unknown enum values, wrong primitive types, and readonly bindings all
	// fail the record parse, so the plugin declines the binding
	expect(parseColorInputParams({ color: { type: 'double' }, view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ swatchFallback: 'nearest', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ picker: 'modal', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ constrain: 'yes', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ gamuts: 'srgb', view: 'color-plus' })).toBeUndefined()
	expect(parseColorInputParams({ readonly: true, view: 'color-plus' })).toBeUndefined()
})

it('normalizes gamut ids, dropping unknowns and duplicates', () => {
	const warn = spyOnWarnings()
	expect(normalizeGamuts(['Display-P3', 'srgb', 'p3', 'banana'], ['srgb'])).toEqual(['p3', 'srgb'])
	expect(warn).toHaveBeenCalledWith('ColorPlus: unknown gamut "banana"... ignoring')
})

it('falls back to a copy of the defaults when no gamut is usable', () => {
	spyOnWarnings()
	const fallback = ['srgb', 'p3']
	for (const gamuts of [undefined, [], ['banana']]) {
		const result = normalizeGamuts(gamuts, fallback)
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
	expect(
		validateColorInputParams({ color: { alpha: true } }, '#ff0066').color?.alpha,
	).toBeUndefined()
	expect(validateColorInputParams({ color: { alpha: true } }, 0xff_00_66).color?.alpha).toBe(true)

	// Float mode is object- and array-only
	expect(validateColorInputParams({ color: { type: 'float' } }, '#ff0066').color?.type).toBe('int')
	expect(
		validateColorInputParams({ color: { type: 'float' } }, { r: 1, g: 0, b: 0.4 }).color?.type,
	).toBe('float')
	expect(validateColorInputParams({ color: { type: 'float' } }, [1, 0, 0.4]).color?.type).toBe(
		'float',
	)

	expect(warn).toHaveBeenCalledTimes(2)
})

it('falls back with a warning for a palette layout that is not a string', () => {
	const warn = spyOnWarnings()
	expect(parseColorInputParams({ paletteChannels: 42, view: 'color-plus' })).toMatchObject({
		paletteChannels: 'CL_H',
	})
	expect(warn).toHaveBeenCalledWith('ColorPlus: unknown paletteChannels "42"... using CL_H')
})
