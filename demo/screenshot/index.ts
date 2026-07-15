/* eslint-disable ts/naming-convention */
/* eslint-disable perfectionist/sort-objects */
import { Pane } from 'tweakpane'
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite'

const paramsInputs = {
	'CSS Color 4 Support!': {
		'Modern Syntax': 'oklch(60% 0.26 11deg / 0.5)',
		'Legacy Syntax': 'oklch(60%, 0.26, 11deg)',
		'Color Function': 'color(--hsv 336deg 100% 100)',
	},
	'Array & Tuple Types!': {
		Tuple: [45, 170, 163],
		'Tuple with Alpha': [45, 170, 163, 0.5],
		'Float Tuple': [0.173, 0.665, 0.641],
	},
	'More Object Types!': {
		'Long Keys': {
			red: 255,
			green: 0,
			blue: 102,
		},
		'Lab Keys': { l: 55, a: 83, b: 21 },
		'HSL Keys': { h: 336, s: 100, l: 50 },
		'Mixed Keys': { r: 255, green: 0, b: 102 },
	},
}

const paramsPalettes = {
	'Wide Color!': {
		'Gamut Boundaries': 'oklch(60% 0.26 11deg)',
	},
	'Highly Customizable Picker!': {
		'Perceptual Plane': 'oklch(.67 0.105 190)',
	},
}

const paneColorPlusInputs = new Pane({
	container: document.querySelector<HTMLDivElement>('div#plus-inputs')!,
	title: 'Tweakpane Plugin Color Plus',
})
paneColorPlusInputs.registerPlugin(TweakpanePluginColorPlus)

const paneColorPlusPalettes = new Pane({
	container: document.querySelector<HTMLDivElement>('div#plus-palettes')!,
	title: undefined,
})
paneColorPlusPalettes.registerPlugin(TweakpanePluginColorPlus)

for (const [title, sectionParams] of Object.entries(paramsInputs)) {
	const folder = paneColorPlusInputs.addFolder({
		title,
		expanded: true,
	})

	for (const label of Object.keys(sectionParams)) {
		const bindingOptions: Record<string, unknown> = {
			view: 'color-plus',
			picker: 'inline',
			label,
		}

		if (label.toLowerCase().includes('float')) {
			bindingOptions.color = {
				type: 'float',
			}
		}

		// eslint-disable-next-line ts/no-unnecessary-type-assertion
		folder.addBinding(sectionParams as Record<string, unknown>, label, bindingOptions)
	}
}

for (const [title, sectionParams] of Object.entries(paramsPalettes)) {
	const folder = paneColorPlusPalettes.addFolder({
		title,
		expanded: true,
	})

	for (const label of Object.keys(sectionParams)) {
		let bindingOptions: Record<string, unknown> = {
			view: 'color-plus',
			picker: 'inline',
			label,
		}

		if (label === 'Gamut Boundaries') {
			bindingOptions = {
				...bindingOptions,
				gamuts: ['srgb', 'p3', 'rec2020'],
				expanded: true,
			}
		} else if (label === 'Perceptual Plane') {
			bindingOptions = {
				...bindingOptions,
				gamuts: ['srgb', 'p3'],
				expanded: true,
				gamutLines: 'all',
				textFields: false,
				gamutLabel: false,
				paletteChannels: 'HL_C',
				paletteProjection: 'perceptual',
			}
		}

		// eslint-disable-next-line ts/no-unnecessary-type-assertion
		folder.addBinding(sectionParams as Record<string, unknown>, label, bindingOptions)
	}
}
