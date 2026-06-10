/* eslint-disable perfectionist/sort-objects */

import { Pane } from 'tweakpane'
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite'

const { ColorPlusModel } = TweakpanePluginColorPlus

// Gamut ids, narrow → wide. Must match the colorjs ids the plugin accepts.
const GAMUT_IDS = ['srgb', 'a98rgb', 'p3', 'rec2020', 'prophoto'] as const

// Channel-to-axis assignments as [X][Y]_[slider].
const PALETTE_CHANNELS_IDS = ['LC_H', 'CL_H', 'LH_C', 'HL_C', 'HC_L', 'CH_L'] as const

const PALETTE_PROJECTION_IDS = ['perceptual', 'stretch', 'okhsv'] as const

const PALETTE_GAMUT_BOUNDARIES_IDS = ['inner', 'outer', 'all', 'none'] as const

// Every adjustable picker option lives here; the controls pane edits it and the
// picker is rebuilt on any change (plugin options can't be changed in place).
const state = {
	paletteChannels: 'CL_H',
	paletteProjection: 'okhsv',
	gamutLines: 'inner',
	gamutLabel: true,
	constrain: true,
	swatchFallback: 'clip',
	alpha: false,
	expanded: true,
	picker: 'inline',
	srgb: true,
	a98rgb: false,
	p3: true,
	rec2020: true,
	prophoto: false,
}

const colorParams = { color: 'oklch(0.65 0.2 13)' }

const pickerPane = new Pane({
	container: document.querySelector<HTMLDivElement>('div#picker')!,
	title: 'Color Plus',
})
pickerPane.registerPlugin(TweakpanePluginColorPlus)

let colorBinding: undefined | { dispose: () => void }

function gamutsFromState(): string[] {
	return GAMUT_IDS.filter((id) => state[id])
}

function buildOptions(): Record<string, unknown> {
	return {
		view: 'color-plus',
		label: 'Color',
		picker: state.picker,
		expanded: state.expanded,
		paletteChannels: state.paletteChannels,
		paletteProjection: state.paletteProjection,
		gamutLines: state.gamutLines,
		gamutLabel: state.gamutLabel,
		constrain: state.constrain,
		swatchFallback: state.swatchFallback,
		gamuts: gamutsFromState(),
	}
}

function rebuildPicker(): void {
	colorBinding?.dispose()

	// Alpha for a string value comes from the value itself, so encode (or drop) it
	// on the bound color to match the alpha toggle.
	const model = ColorPlusModel.create(colorParams.color)
	if (model !== undefined) {
		colorParams.color = model.serialize(
			{ alpha: state.alpha, format: 'oklch', space: 'oklch', type: 'string' },
			state.alpha,
		)
	}

	colorBinding = pickerPane.addBinding(colorParams, 'color', buildOptions())
}

const controlsPane = new Pane({
	container: document.querySelector<HTMLDivElement>('div#controls')!,
	title: 'Picker options',
})

controlsPane.addBinding(state, 'paletteChannels', {
	options: Object.fromEntries(PALETTE_CHANNELS_IDS.map((id) => [id, id])),
})
controlsPane.addBinding(state, 'paletteProjection', {
	options: Object.fromEntries(PALETTE_PROJECTION_IDS.map((id) => [id, id])),
})
controlsPane.addBinding(state, 'gamutLines', {
	options: Object.fromEntries(PALETTE_GAMUT_BOUNDARIES_IDS.map((id) => [id, id])),
})
controlsPane.addBinding(state, 'gamutLabel')
controlsPane.addBinding(state, 'constrain')
controlsPane.addBinding(state, 'swatchFallback', {
	options: { clip: 'clip', css: 'css' },
})
controlsPane.addBinding(state, 'alpha')
controlsPane.addBinding(state, 'expanded')
controlsPane.addBinding(state, 'picker', {
	options: { inline: 'inline', popup: 'popup' },
})

const gamutsFolder = controlsPane.addFolder({ title: 'Gamuts', expanded: true })
for (const id of GAMUT_IDS) {
	gamutsFolder.addBinding(state, id)
}

controlsPane.on('change', () => {
	rebuildPicker()
})

rebuildPicker()
