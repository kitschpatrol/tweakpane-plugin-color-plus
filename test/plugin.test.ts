import { BindingTarget, createValue, ViewProps } from '@tweakpane/core'
import { afterEach, expect, it, vi } from 'vitest'
import { ColorController } from '../src/controller/color.js'
import { css, id, plugins } from '../src/index.js'
import { ColorPlus } from '../src/model/color-plus.js'
import { maxChroma } from '../src/model/gamut.js'
import { ColorPlusInputPlugin } from '../src/plugin.js'
import { spyOnWarnings } from './helpers.js'

// The controller builds DOM views; stub it to capture the configuration the
// plugin hands it, which carries the text parser and formatter
// eslint-disable-next-line ts/naming-convention -- Mirrors the class export
vi.mock('../src/controller/color.js', () => ({ ColorController: vi.fn() }))

afterEach(() => {
	vi.restoreAllMocks()
})

type Params = Record<string, unknown>

function accept(value: unknown, params: Params = {}) {
	const result = ColorPlusInputPlugin.accept(value, { view: 'color-plus', ...params })
	expect(result).not.toBeNull()
	return result!
}

function createReader(value: unknown, params: Params = {}) {
	const acceptance = accept(value, params)
	const target = new BindingTarget({ color: value }, 'color')
	const reader = ColorPlusInputPlugin.binding.reader({
		initialValue: acceptance.initialValue,
		params: acceptance.params,
		target,
	})
	return { params: acceptance.params, reader }
}

function createControllerConfig(value: unknown, params: Params = {}) {
	vi.mocked(ColorController).mockClear()
	const acceptance = accept(value, params)
	ColorPlusInputPlugin.controller({
		constraint: undefined,
		// The stubbed controller never touches the document
		document: undefined as unknown as Document,
		initialValue: acceptance.initialValue,
		params: acceptance.params,
		value: createValue(acceptance.params.lastInternalValue),
		viewProps: ViewProps.create(),
	})
	const config = vi.mocked(ColorController).mock.calls[0]![1]
	return { config, params: acceptance.params }
}

const hex = { alpha: false, format: 'hex', space: 'srgb', type: 'string' } as const
const HEX_STRING = /^#[\da-f]{6}$/v

it('exposes the plugin bundle', () => {
	expect(id).toBe('color-plus')
	expect(plugins).toEqual([ColorPlusInputPlugin])
	expect(typeof css).toBe('string')
})

it('declines bindings for other views', () => {
	expect(ColorPlusInputPlugin.accept('#ff0066', {})).toBeNull()
	expect(ColorPlusInputPlugin.accept('#ff0066', { view: 'color' })).toBeNull()
})

it('declines values it cannot parse and params it cannot validate', () => {
	const warn = spyOnWarnings()
	expect(ColorPlusInputPlugin.accept('bogus', { view: 'color-plus' })).toBeNull()
	expect(ColorPlusInputPlugin.accept(() => 1, { view: 'color-plus' })).toBeNull()
	expect(warn).toHaveBeenCalledWith('ColorPlusInputPlugin could not parse and get format')
	expect(
		ColorPlusInputPlugin.accept('#ff0066', { color: { type: 'double' }, view: 'color-plus' }),
	).toBeNull()
})

it('fills in defaults adapted to an sRGB-bound value', () => {
	const result = accept('#ff0066')
	expect(result.initialValue).toBe('#ff0066')
	expect(result.params).toMatchObject({
		color: { alpha: undefined, formatLocked: true, type: 'int' },
		constrain: true,
		format: { alpha: false, space: 'srgb', type: 'string' },
		gamutLabel: false,
		gamutLines: 'inner',
		gamuts: ['srgb'],
		lastExternalValue: '#ff0066',
		paletteChannels: 'CL_H',
		paletteProjection: 'okhsv',
		swatchFallback: 'clip',
		textFields: true,
		textsMode: 'hex',
	})
	// The internal working representation is OKLCH
	expect(result.params.lastInternalValue.space).toBe('oklch')
	expect(result.params.lastInternalValue.serialize(hex)).toBe('#ff0066')
})

it('fills in wide-gamut defaults for a perceptual value and normalizes gamuts', () => {
	const warn = spyOnWarnings()
	const result = accept('oklch(60% 0.2 30)', { gamuts: ['Display-P3', 'srgb', 'banana'] })
	expect(result.initialValue).toBe('oklch(60% 0.2 30)')
	expect(result.params).toMatchObject({
		gamutLabel: true,
		gamuts: ['p3', 'srgb'],
		textsMode: 'oklch',
	})
	expect(warn).toHaveBeenCalledWith('ColorPlus: unknown gamut "banana"... ignoring')
})

it('honors explicit options over the defaults', () => {
	const result = accept(0xff_00_66_7f, {
		color: { alpha: true, formatLocked: false },
		constrain: false,
		expanded: true,
		gamutLabel: true,
		gamutLines: 'all',
		gamuts: ['rec2020'],
		paletteChannels: 'LC_H',
		paletteProjection: 'stretch',
		picker: 'inline',
		swatchFallback: 'css',
		textFields: false,
	})
	expect(result.initialValue).toBe(0xff_00_66_7f)
	expect(result.params).toMatchObject({
		color: { alpha: true, formatLocked: false, type: 'int' },
		constrain: false,
		expanded: true,
		format: { alpha: true, type: 'number' },
		gamutLabel: true,
		gamutLines: 'all',
		gamuts: ['rec2020'],
		paletteChannels: 'LC_H',
		paletteProjection: 'stretch',
		picker: 'inline',
		swatchFallback: 'css',
		textFields: false,
		textsMode: 'hex',
	})
})

it('warns about the alpha flag on non-number values and keeps the format alpha-free', () => {
	const warn = spyOnWarnings()
	const result = accept('#ff0066', { color: { alpha: true } })
	expect(result.initialValue).toBe('#ff0066')
	expect(result.params.format.alpha).toBe(false)
	expect(warn).toHaveBeenCalledWith(
		'ColorPlus: alpha mode is only supported for number values... ignoring',
	)
})

it('derives the initial value in the bound value format', () => {
	const result = accept({ r: 1, g: 0, b: 0.4 }, { color: { type: 'float' } })
	const value = result.initialValue as Record<string, number>
	expect(value.r).toBeCloseTo(1, 10)
	expect(value.g).toBeCloseTo(0, 10)
	expect(value.b).toBeCloseTo(0.4, 10)
	expect(result.params.format).toMatchObject({ format: { colorType: 'float' }, type: 'object' })

	expect(accept([255, 0, 102]).initialValue).toEqual([255, 0, 102])
	expect(accept(0xff_00_66).initialValue).toBe(0xff_00_66)
})

it('compares internal values by color, not identity', () => {
	const a = ColorPlus.create('#ff0066')!
	const b = ColorPlus.create('#ff0066')!
	const c = ColorPlus.create('#0080ff')!
	expect(ColorPlusInputPlugin.binding.equals!(a, b)).toBe(true)
	expect(ColorPlusInputPlugin.binding.equals!(a, c)).toBe(false)
})

it('reuses the internal value while the external representation is unchanged', () => {
	// A fresh but equal value, as after a pane refresh, must not re-parse and
	// lose the extra internal precision
	const tuple = createReader([255, 0, 102])
	expect(tuple.reader([255, 0, 102])).toBe(tuple.params.lastInternalValue)

	const object = createReader({ r: 255, g: 0, b: 102 })
	expect(object.reader({ r: 255, g: 0, b: 102 })).toBe(object.params.lastInternalValue)

	const string = createReader('#ff0066')
	expect(string.reader('#ff0066')).toBe(string.params.lastInternalValue)

	const number = createReader(0xff_00_66)
	expect(number.reader(0xff_00_66)).toBe(number.params.lastInternalValue)
})

it('parses a changed external value into OKLCH', () => {
	const string = createReader('#ff0066')
	const read = string.reader('#0080ff')
	expect(read).not.toBe(string.params.lastInternalValue)
	expect(read.space).toBe('oklch')
	expect(read.serialize(hex)).toBe('#0080ff')

	// Arrays and objects that differ in length, keys, or values re-parse too
	const tuple = createReader([255, 0, 102])
	expect(tuple.reader([255, 0, 102, 0.5])).not.toBe(tuple.params.lastInternalValue)
	expect(tuple.reader([0, 128, 255])).not.toBe(tuple.params.lastInternalValue)
	expect(tuple.reader({ r: 255, g: 0, b: 102 })).not.toBe(tuple.params.lastInternalValue)

	const object = createReader({ r: 255, g: 0, b: 102 })
	expect(object.reader({ r: 255, g: 0, b: 102, a: 1 })).not.toBe(object.params.lastInternalValue)
	expect(object.reader({ r: 0, g: 128, b: 255 })).not.toBe(object.params.lastInternalValue)
	expect(object.reader(0xff_00_66)).not.toBe(object.params.lastInternalValue)
})

it('keeps the last internal value when the external value cannot be parsed', () => {
	const warn = spyOnWarnings()
	const { params, reader } = createReader('#ff0066')
	expect(reader('bogus')).toBe(params.lastInternalValue)
	expect(warn).toHaveBeenCalledWith('ColorPlusInputPlugin could not parse, using last value')
})

it('constrains a read value into the configured gamuts unless disabled', () => {
	const constrained = createReader('oklch(60% 0.1 30)', { gamuts: ['srgb'] })
	const [, chroma] = constrained.reader('oklch(65% 0.4 13)').getAll('oklch')
	expect(chroma).toBeLessThan(0.4)
	expect(chroma).toBeCloseTo(maxChroma(0.65, 13, 'srgb'), 6)

	const unconstrained = createReader('oklch(60% 0.1 30)', { constrain: false, gamuts: ['srgb'] })
	expect(unconstrained.reader('oklch(65% 0.4 13)').getAll('oklch')[1]).toBeCloseTo(0.4, 10)
})

it('configures the controller from the params', () => {
	const { config } = createControllerConfig('#ff0066', { expanded: true, picker: 'inline' })
	expect(config).toMatchObject({
		colorType: 'int',
		constrain: true,
		expanded: true,
		gamutLabel: false,
		gamutLines: 'inner',
		gamuts: ['srgb'],
		paletteChannels: 'CL_H',
		paletteProjection: 'okhsv',
		pickerLayout: 'inline',
		quantizePalette: false,
		supportsAlpha: false,
		swatchFallback: 'clip',
		textFields: true,
		textsMode: 'hex',
	})
	expect(config.formatter(ColorPlus.create('#0080ff')!)).toBe('#0080ff')

	const { config: defaults } = createControllerConfig('#ff0066')
	expect(defaults).toMatchObject({ expanded: false, pickerLayout: 'popup' })
})

it('supports alpha when the format carries it or the alpha flag is set', () => {
	expect(createControllerConfig('#ff006680').config.supportsAlpha).toBe(true)
	expect(
		createControllerConfig(0xff_00_66_7f, { color: { alpha: true } }).config.supportsAlpha,
	).toBe(true)
	expect(createControllerConfig(0xff_00_66).config.supportsAlpha).toBe(false)
})

it('quantizes the palette only for locked named-color bindings', () => {
	expect(createControllerConfig('red').config.quantizePalette).toBe(true)
	expect(
		createControllerConfig('red', { color: { formatLocked: false } }).config.quantizePalette,
	).toBe(false)
	expect(createControllerConfig('#ff0000').config.quantizePalette).toBe(false)
})

it('parses typed text into OKLCH, dropping alpha the format cannot carry', () => {
	const parsed = createControllerConfig('#ff0066').config.parser('rgb(0 128 255 / 0.5)')!
	expect(parsed.space).toBe('oklch')
	expect(parsed.alpha).toBe(1)
	expect(parsed.serialize(hex)).toBe('#0080ff')

	// A format with alpha keeps it, as does the number alpha flag
	expect(createControllerConfig('#ff006680').config.parser('rgb(0 128 255 / 0.5)')!.alpha).toBe(0.5)
	expect(
		createControllerConfig(0xff_00_66_7f, { color: { alpha: true } }).config.parser(
			'rgb(0 128 255 / 0.5)',
		)!.alpha,
	).toBe(0.5)
})

it('rejects typed text it cannot parse', () => {
	spyOnWarnings()
	expect(createControllerConfig('#ff0066').config.parser('bogus')).toBeNull()
})

it('constrains typed colors into the configured gamuts unless disabled', () => {
	const { config } = createControllerConfig('oklch(60% 0.1 30)', { gamuts: ['srgb'] })
	expect(config.parser('oklch(65% 0.4 13)')!.getAll('oklch')[1]).toBeCloseTo(
		maxChroma(0.65, 13, 'srgb'),
		6,
	)

	const unconstrained = createControllerConfig('oklch(60% 0.1 30)', { constrain: false })
	expect(unconstrained.config.parser('oklch(65% 0.4 13)')!.getAll('oklch')[1]).toBeCloseTo(0.4, 10)
})

it('switches the binding format to the typed format only when unlocked', () => {
	const unlocked = createControllerConfig('#ff0066', { color: { formatLocked: false } })
	expect(unlocked.params.format).toMatchObject({ space: 'srgb', type: 'string' })
	unlocked.config.parser('oklch(60% 0.2 30)')
	expect(unlocked.params.format).toMatchObject({ space: 'oklch', type: 'string' })
	// The formatter follows the new format
	expect(unlocked.config.formatter(ColorPlus.create('oklch(60% 0.2 30)')!)).toBe(
		'oklch(60% 0.2 30)',
	)

	const locked = createControllerConfig('#ff0066')
	locked.config.parser('oklch(60% 0.2 30)')
	expect(locked.params.format).toMatchObject({ space: 'srgb', type: 'string' })
	expect(locked.config.formatter(ColorPlus.create('oklch(60% 0.2 30)')!)).toMatch(HEX_STRING)
})
