import { connectValues, createValue } from '@tweakpane/core'
import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus.js'
import { withAlpha } from '../src/utilities.js'

function color(value: string): ColorPlus {
	const created = ColorPlus.create(value)
	if (created === undefined) {
		throw new Error(`Failed to parse test color "${value}"`)
	}

	return created
}

it('returns a new color with the alpha replaced, leaving the input untouched', () => {
	const input = color('rgb(255 0 102 / 0.5)')
	const result = withAlpha(input, 0.25)

	expect(result).not.toBe(input)
	expect(result.alpha).toBe(0.25)
	expect(input.alpha).toBe(0.5)

	// Nothing but alpha changes
	expect(withAlpha(result, 0.5).equals(input)).toBe(true)
})

it('constrains the alpha to the unit range', () => {
	expect(withAlpha(color('red'), 2).alpha).toBe(1)
	expect(withAlpha(color('red'), -1).alpha).toBe(0)
})

it('lets an alpha text edit reach the primary as a change event', () => {
	// Wired like the picker's alpha text field. The primary compares the
	// previous and next values before emitting, so the sync has to hand it a
	// fresh instance; mutating the held value in place would silence the event
	const primary = createValue(color('rgb(255 0 102 / 0.5)'), {
		equals: (a, b) => a.equals(b),
	})
	const alphaText = createValue(0)
	const emitted: number[] = []
	primary.emitter.on('change', (event) => {
		emitted.push(event.rawValue.alpha)
	})
	connectValues({
		backward: (p, s) => withAlpha(p, s),
		forward: (p) => p.alpha,
		primary,
		secondary: alphaText,
	})
	expect(alphaText.rawValue).toBe(0.5)

	// A typed value commits without forceEmit, like the text field's change handler
	alphaText.rawValue = 0.25
	expect(emitted).toEqual([0.25])
	expect(primary.rawValue.alpha).toBe(0.25)

	// And the primary's own changes still flow to the field
	primary.rawValue = color('rgb(0 128 255 / 0.75)')
	expect(alphaText.rawValue).toBe(0.75)
})
