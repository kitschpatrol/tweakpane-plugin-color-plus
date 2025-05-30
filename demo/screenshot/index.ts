/* eslint-disable ts/naming-convention */
/* eslint-disable perfectionist/sort-objects */
import { Pane } from 'tweakpane'
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite'

const params = {
	'CSS Color 4 Support!': {
		'Modern Syntax': 'oklch(60% 0.26 11deg / 0.5)',
		'Legacy Syntax': 'oklch(60%, 0.26, 11deg)',
		'Color Function': 'color(--hsv 336deg 100% 100)',
	},
	'Array & Tuple Types!': {
		Tuple: [255, 0, 102],
		'Tuple with Alpha': [255, 0, 102, 0.5],
		'Float Tuple': [1, 0, 0.4],
	},
	'More Object Types!': {
		'Long Keys': {
			red: 255,
			green: 0,
			blue: 102,
		},
		'Lab Keys': { l: 55, a: 83, b: 21 },
		'HSL Keys': { h: 336, s: 100, l: 50 },
	},
}

const paneColorPlus = new Pane({
	container: document.querySelector<HTMLDivElement>('div#plus')!,
	title: 'Tweakpane Plugin Color Plus',
})
paneColorPlus.registerPlugin(TweakpanePluginColorPlus)

for (const [title, sectionParams] of Object.entries(params)) {
	const folder = paneColorPlus.addFolder({
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

		folder.addBinding(sectionParams as Record<string, unknown>, label, bindingOptions)
	}
}
