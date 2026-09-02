import { createValue } from '@tweakpane/core'
import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus'
import { createKeywordDisplayValue, snapToNearestKeyword } from '../src/utilities'

function color(value: string): ColorPlus {
	const created = ColorPlus.create(value)
	if (created === undefined) {
		throw new Error(`Failed to parse test color "${value}"`)
	}

	return created
}

it('snaps a near-keyword color to the exact keyword coordinates', () => {
	const snapped = snapToNearestKeyword(color('#663398'))
	const [r, g, b] = snapped.getAll('srgb')

	// Rebeccapurple is #663399
	expect(r).toBeCloseTo(0.4, 10)
	expect(g).toBeCloseTo(0.2, 10)
	expect(b).toBeCloseTo(0.6, 10)
})

it('keeps an exact keyword color fixed', () => {
	const firebrick = color('firebrick')
	const snapped = snapToNearestKeyword(firebrick)
	expect(snapped.equals(firebrick)).toBe(true)
})

it('preserves alpha and does not mutate the input', () => {
	const input = color('rgba(102, 51, 152, 0.5)')
	const original = input.clone()
	const snapped = snapToNearestKeyword(input)

	expect(snapped.alpha).toBe(0.5)
	expect(input.equals(original)).toBe(true)
	expect(snapped.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' })).toBe(
		'#663399',
	)
})

it('mirrors the primary value snapped, in real time', () => {
	const primary = createValue(color('red'))
	const { disconnect, value: display } = createKeywordDisplayValue(primary)

	expect(
		display.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#ff0000')

	// A precise color inside the firebrick patch
	primary.rawValue = color('#b2222a')
	expect(
		display.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#b22222')

	// The primary keeps the continuous color
	expect(
		primary.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#b2222a')

	disconnect()

	// After disconnecting, the display no longer follows
	primary.rawValue = color('blue')
	expect(
		display.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#b22222')
})

it('passes writes through to the primary unsnapped', () => {
	const primary = createValue(color('red'))
	const { value: display } = createKeywordDisplayValue(primary)

	// A text-field edit writes a precise color into the display value
	display.rawValue = color('#663398')

	expect(
		primary.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#663398')

	// The display re-reads snapped
	expect(
		display.rawValue.serialize({ alpha: false, format: 'hex', space: 'srgb', type: 'string' }),
	).toBe('#663399')
})
