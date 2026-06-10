import type { BindingWriter } from '@tweakpane/core'
import { BindingTarget } from '@tweakpane/core'
import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus.js'
import { ColorPlusInputPlugin } from '../src/plugin.js'

/**
 * Build a writer for an externally bound value the same way Tweakpane does:
 * accept() derives the format and internal params, then binding.writer() is
 * created against a target wrapping the bound object.
 */
function createWriter(holder: Record<string, unknown>): {
	target: BindingTarget
	writer: BindingWriter<ColorPlus>
} {
	const acceptance = ColorPlusInputPlugin.accept(holder.color, { view: 'color-plus' }) ?? undefined
	expect(acceptance).toBeDefined()
	const target = new BindingTarget(holder, 'color')
	const writer = ColorPlusInputPlugin.binding.writer({
		initialValue: acceptance!.initialValue,
		params: acceptance!.params,
		target,
	})
	return { target, writer }
}

function createInternalColor(value: unknown): ColorPlus {
	const color = ColorPlus.create(value)
	expect(color).toBeDefined()
	color!.convert('oklch')
	return color!
}

it('writes tuple colors back into the bound array in place', () => {
	const externalValue = [255, 0, 102]
	const holder: Record<string, unknown> = { color: externalValue }
	const { target, writer } = createWriter(holder)

	writer(target, createInternalColor('#0080ff'))

	expect(holder.color).toBe(externalValue)
	expect(externalValue[0]).toBeCloseTo(0, 6)
	expect(externalValue[1]).toBeCloseTo(128, 6)
	expect(externalValue[2]).toBeCloseTo(255, 6)
})

it('writes tuple colors with alpha back into the bound array in place', () => {
	const externalValue = [255, 0, 102, 0.5]
	const holder: Record<string, unknown> = { color: externalValue }
	const { target, writer } = createWriter(holder)

	writer(target, createInternalColor([0, 128, 255, 0.25]))

	expect(holder.color).toBe(externalValue)
	expect(externalValue[0]).toBeCloseTo(0, 6)
	expect(externalValue[1]).toBeCloseTo(128, 6)
	expect(externalValue[2]).toBeCloseTo(255, 6)
	expect(externalValue[3]).toBeCloseTo(0.25, 6)
})

it('writes object colors back into the bound object in place', () => {
	const externalValue = { r: 255, g: 0, b: 102 }
	const holder: Record<string, unknown> = { color: externalValue }
	const { target, writer } = createWriter(holder)

	writer(target, createInternalColor('#0080ff'))

	expect(holder.color).toBe(externalValue)
	expect(externalValue.r).toBeCloseTo(0, 6)
	expect(externalValue.g).toBeCloseTo(128, 6)
	expect(externalValue.b).toBeCloseTo(255, 6)
})

it('writes string colors back to the bound property', () => {
	const holder: Record<string, unknown> = { color: '#ff0066' }
	const { target, writer } = createWriter(holder)

	writer(target, createInternalColor('#0080ff'))

	expect(holder.color).toBe('#0080ff')
})

it('writes number colors back to the bound property', () => {
	const holder: Record<string, unknown> = { color: 0xff_00_66 }
	const { target, writer } = createWriter(holder)

	writer(target, createInternalColor('#0080ff'))

	expect(holder.color).toBe(0x00_80_ff)
})
