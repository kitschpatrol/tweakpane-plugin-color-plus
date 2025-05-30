/* eslint-disable perfectionist/sort-objects */
/* eslint-disable capitalized-comments */
import { isObject } from '@tweakpane/core'
import { Pane } from 'tweakpane'
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite'

const params: Record<string, unknown> = {
	// // hex strings
	hexString: '#ff0066',
	// hexStringAlpha: '#ff00667f',

	// // numbers
	// number: 0xff0066,
	// numberAlpha: 0xff00667f,

	// // objects
	// object: {
	// 	r: 255,
	// 	g: 0,
	// 	b: 102,
	// },
	// objectAlpha: {
	// 	r: 255,
	// 	g: 0,
	// 	b: 102,
	// 	a: 0.5,
	// },
	// objectFloat: {
	// 	r: 1,
	// 	g: 0,
	// 	b: 0.4,
	// },
	// objectFloatAlpha: {
	// 	r: 1,
	// 	g: 0,
	// 	b: 0.4,
	// 	a: 0.5,
	// },
	// objectLongKeys: {
	// 	red: 255,
	// 	green: 0,
	// 	blue: 102,
	// },
	// objectLongKeysAlpha: {
	// 	red: 255,
	// 	green: 0,
	// 	blue: 102,
	// 	alpha: 0.5,
	// },
	// objectMixedKeys: {
	// 	r: 255,
	// 	green: 0,
	// 	b: 102,
	// },
	// objectHsl: {h: 336, s: 100, l: 50},
	// objectHsv: {h: 336, s: 100, v: 100},
	// objectHwb: {h: 336, w: 0, b: 0},
	// objectLab: {l: 55, a: 83, b: 21},
	// objectLch: {
	// 	l: 55,
	// 	c: 85,
	// 	h: 14,
	// },

	// // tuples
	// tuple: [255, 0, 102],
	// tupleAlpha: [255, 0, 102, 0.5],
	// tupleFloat: [1, 0, 0.4],
	// tupleFloatAlpha: [1, 0, 0.4, 0.5],

	// // color() strings
	colorPrefixHsv: 'color(--hsv 336deg 100% 100)',
	// colorA98Rgb: 'color(a98-rgb 0.86 0 0.39)',
	// colorDisplayP3: 'color(display-p3 0.92 0.2 0.41)',
	// colorProphotoRgb: 'color(prophoto-rgb 0.72 0.28 0.33)',
	// colorRec2020: 'color(rec2020 0.8 0.23 0.35)',
	// colorSrgb: 'color(srgb 1 0% 40%)',
	// colorSrgbLinear: 'color(srgb-linear 1 0 0.13)',
	// colorXyz: 'color(xyz 0.44 0.22 0.15)',
	// colorXyzD50: 'color(xyz-d50 0.46 0.23 0.11)',
	// colorXyzD65: 'color(xyz-d65 0.44 0.22 0.15)',
	// colorHsl: 'color(hsl 336 100% 50%)',
	// colorHwb: 'color(hwb 336 0% 0%)',
	// colorLab: 'color(lab 55 66% 16%)',
	// colorLabD65: 'color(lab-d65 54 66% 15%)',
	// colorLch: 'color(lch 55 56% 4%)',
	// colorOklab: 'color(oklab 0.64 0.25 0.05)',
	// colorOklch: 'color(oklch 60% 0.24 13deg)',

	// // hsl() strings (Tweakpane built-in)
	// funcHslLegacy: 'hsl(336, 100%, 50%)',
	funcHsl: 'hsl(336 100% 50%)',
	// funcHslAlpha: 'hsl(336 100% 50% / 0.5)',
	// funcHslLegacyNoUnits: 'hsl(336, 100, 50)',
	// funcHslFancyUnits: 'hsl(336deg 100% 50% / .5)',

	// // hsla() strings (Tweakpane built-in)
	// funcHslaLegacy: 'hsla(336, 100%, 50%, 0.5)',
	// funcHsla: 'hsla(336 100% 50% / 0.5)',
	// funcHslaLegacyNoUnits: 'hsla(336, 100, 50, 0.5)',
	// funcHslaFancyUnits: 'hsla(336deg 100% 50% / 0.5)',

	// // hwb() strings
	// funcHwbLegacy: 'hwb(336, 0%, 0%)',
	// funcHwb: 'hwb(336 0% 0%)',
	// funcHwbAlpha: 'hwb(336 0% 0% / 0.5)',

	// // lab() strings
	// funcLabLegacy: 'lab(55%, 83, 21)',
	// funcLab: 'lab(55% 83 21)',
	// funcLabAlpha: 'lab(55% 83 21 / 0.5)',

	// // lch() strings
	// funcLchLegacy: 'lch(55, 85, 14)',
	// funcLch: 'lch(55 85 14)',
	// funcLchAlpha: 'lch(55 85 14 / 0.5)',

	// // oklab() strings
	// funcOklabLegacy: 'oklab(0.64, 0.25, 0.05)',
	// funcOklab: 'oklab(0.64 0.25 0.05)',
	// funcOklabAlpha: 'oklab(0.64 0.25 0.05 / 0.5)',

	// oklch() strings
	// funcOklchLegacy: 'oklch(60%, 0.26, 11deg)',
	// funcOklch: 'oklch(60% 0.26 11deg)',
	funcOklchAlpha: 'oklch(60% 0.26 11deg / 0.5)',

	// // rgb() strings (Tweakpane built-in)
	// funcRgbLegacy: 'rgb(255, 0, 102)',
	// funcRgb: 'rgb(255 0 102)',
	// funcRgbAlpha: 'rgb(255 0 102 / 0.5)',

	// // rgba() strings (Tweakpane built-in)
	// funcRgbaLegacy: 'rgba(255, 0, 102, 0.5)',
	// funcRgba: 'rgba(255 0 102 / 0.5)',
}

// Some params are completely unsupported by Tweakpane's built-in input handlers, and must be explicitly ignored
const ignoredParams = new Set([
	'colorA98Rgb',
	'colorDisplayP3',
	'colorHsl',
	'colorHwb',
	'colorLab',
	'colorLabD65',
	'colorLch',
	'colorOklab',
	'colorOklch',
	'colorPrefixHsv',
	'colorProphotoRgb',
	'colorRec2020',
	'colorSrgb',
	'colorSrgbLinear',
	'colorXyz',
	'colorXyzD50',
	'colorXyzD65',
	'funcHsl',
	'funcHsla',
	'funcHslaFancyUnits',
	'funcHslAlpha',
	'funcHslFancyUnits',
	'funcHwb',
	'funcHwbAlpha',
	'funcHwbLegacy',
	'funcLab',
	'funcLabAlpha',
	'funcLabLegacy',
	'funcLch',
	'funcLchAlpha',
	'funcLchLegacy',
	'funcOklab',
	'funcOklabAlpha',
	'funcOklabLegacy',
	'funcOklch',
	'funcOklchAlpha',
	'funcOklchLegacy',
	'funcRgb',
	'funcRgba',
	'funcRgbAlpha',
	'objectHsl',
	'objectHsv',
	'objectHwb',
	'objectLab',
	'objectLch',
	'objectLongKeys',
	'objectLongKeysAlpha',
	'objectMixedKeys',
	'tuple',
	'tupleAlpha',
	'tupleFloat',
	'tupleFloatAlpha',
])

// Some params need extra properties
// Tweakpane Plugin Color Plus implements the same
// properties as Tweakpane's built-in color input binding
const extraProps = {
	numberAlpha: {
		color: {
			alpha: true,
		},
	},
	objectFloat: {
		color: {
			type: 'float',
		},
	},
	objectFloatAlpha: {
		color: {
			type: 'float',
		},
	},
	tupleFloat: {
		color: {
			type: 'float',
		},
	},
	tupleFloatAlpha: {
		color: {
			type: 'float',
		},
	},
}

function prettyLabel(label: string): string {
	return label.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (string_) => string_.toUpperCase())
}

const paneColorPlus = new Pane({
	container: document.querySelector<HTMLDivElement>('div#plus')!,
	title: 'Tweakpane Plugin Color Plus',
})
paneColorPlus.registerPlugin(TweakpanePluginColorPlus)

const paneColorOriginal = new Pane({
	container: document.querySelector<HTMLDivElement>('div#integrated')!,
	title: 'Tweakpane Integrated Color',
})

for (const key of Object.keys(params)) {
	paneColorPlus.addBinding(params, key, {
		view: 'color-plus',
		picker: 'inline',
		label: prettyLabel(key),
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		...extraProps[key as keyof typeof extraProps],
	})

	// Special case for ignored keys...
	if (ignoredParams.has(key)) {
		paneColorOriginal.addBinding(
			{
				value: `${isObject(params[key]) ? JSON.stringify(params[key]) : String(params[key])} (Unsupported)`,
			},
			'value',
			{
				disabled: true,
				label: prettyLabel(key),
			},
		)
	} else {
		paneColorOriginal.addBinding(params, key, {
			view: 'color',
			picker: 'inline',
			label: prettyLabel(key),
			// eslint-disable-next-line ts/no-unsafe-type-assertion
			...extraProps[key as keyof typeof extraProps],
		})
	}
}

paneColorPlus.on('change', () => {
	paneColorOriginal.refresh()
})

paneColorOriginal.on('change', () => {
	paneColorPlus.refresh()
})
