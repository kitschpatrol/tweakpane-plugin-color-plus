import type { BindingApi } from '@tweakpane/core'
import { Pane } from 'tweakpane'
import { afterEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index'

describe('color-plus plugin', () => {
	let pane: Pane | undefined

	afterEach(() => {
		pane?.dispose()
		pane = undefined
	})

	function setup(params: { color: unknown }) {
		pane = new Pane()
		pane.registerPlugin(plugin)
		const binding: BindingApi = pane.addBinding(params, 'color', { view: 'color-plus' })
		const input = binding.element.querySelector<HTMLInputElement>(':scope .tp-colv_t input')
		if (!input) {
			throw new Error('The color text input was not created')
		}

		return { binding, input, pane, params }
	}

	function commit(input: HTMLInputElement, text: string) {
		input.value = text
		input.dispatchEvent(new Event('change', { bubbles: true }))
	}

	it('registers the bundle and installs its compiled styles', () => {
		const { binding } = setup({ color: '#ff0000' })
		expect(plugin.id).toBe('color-plus')
		// Core styles the color view; the bundle adds the palette and slider styles.
		expect(plugin.css).toContain('.tp-plpv')
		expect(plugin.css).not.toContain('@use')
		expect(plugin.css).not.toContain('__css__')
		expect(document.head.textContent).toContain('.tp-plpv')
		expect(binding.element.querySelector('.tp-colv_s')).not.toBeNull()
	})

	it.each([
		['a hex string', '#336699'],
		['a number', 0x33_66_99],
		['an object', { r: 51, g: 102, b: 153 }],
		['a tuple', [51, 102, 153]],
	])('creates a color view for %s', (_label, color) => {
		const { binding, input } = setup({ color })
		expect(binding.element.querySelector('.tp-colv')).not.toBeNull()
		expect(input.value).not.toBe('')
	})

	it('writes committed text in the bound string format and emits a final change', () => {
		const { binding, input, params } = setup({ color: '#ff0000' })
		const changes: Array<{ last: boolean; value: unknown }> = []
		binding.on('change', (event) => {
			changes.push({ last: event.last, value: event.value })
		})
		commit(input, '#00ff00')
		expect(params.color).toBe('#00ff00')
		expect(changes.at(-1)).toEqual({ last: true, value: '#00ff00' })
	})

	it('keeps the bound value when the committed text cannot be parsed', () => {
		const { input, params } = setup({ color: '#ff0000' })
		commit(input, 'not a color')
		expect(params.color).toBe('#ff0000')
	})

	it('shows external changes after a refresh', () => {
		const { binding, input, params } = setup({ color: '#ff0000' })
		params.color = '#336699'
		binding.refresh()
		expect(input.value).toBe('#336699')
		expect(params.color).toBe('#336699')
	})

	it('inherits the pane disabled state', () => {
		const { input, pane: currentPane } = setup({ color: '#ff0000' })
		currentPane.disabled = true
		expect(input.disabled).toBe(true)
		currentPane.disabled = false
		expect(input.disabled).toBe(false)
	})

	it('removes its elements when disposed', () => {
		const { binding, input } = setup({ color: '#ff0000' })
		binding.dispose()
		expect(binding.element.isConnected).toBe(false)
		expect(input.isConnected).toBe(false)
	})
})
