import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite';

const params: Record<string, unknown> = {
	// hexString: '#ff00ff',
	// hexStringAlpha: '#ff00ffcc',
	// oklchString: 'oklch(65% 0.26 357deg)',
	// oklchStringAlpha: 'oklch(65% 0.26 357deg / 50%)',
	// number: 0xff00ff,
	// numberAlpha: 0xff00ffcc,
	// object: {
	// 	r: 255,
	// 	g: 0,
	// 	b: 255,
	// },
	// objectAlpha: {
	// 	r: 255,
	// 	g: 0,
	// 	b: 255,
	// 	a: 0.5,
	// },
	// objectFloat: {
	// 	r: 1,
	// 	g: 0,
	// 	b: 1,
	// },
	// objectFloatAlpha: {
	// 	r: 1,
	// 	g: 0,
	// 	b: 1,
	// 	a: 0.5,
	// },
	// tuple: [255, 0, 255],
	// tupleAlpha: [255, 0, 255, 0.25],
	// tupleFloat: [1, 0, 1],
	// tupleFloatAlpha: [1, 0, 1, 0.25],
	// // typedArray: new Float32Array(4).fill(0.5),
	hexA: '#f06', // {spaceId: "srgb", coords: [1, 0, 0.4], alpha: 1}
	// hexB: '#f068', // {spaceId: "srgb", coords: [1, 0, 0.4], alpha: 0.5333333333333333}
	// hexC: '#ff0066', // {spaceId: "srgb", coords: [1, 0, 0.4], alpha: 1}
	// hexD: '#ff006688', // {spaceId: "srgb", coords: [1, 0, 0.4], alpha: 0.5333333333333333}
	namedA: 'blue', // {spaceId: "srgb", coords: [0, 0, 1], alpha: 1}
	// // namedB: 'transparent', // {spaceId: "srgb", coords: [0, 0, 0], alpha: 0}
	// colorPrefixHsv: 'color(--hsv 25deg 50% 75)', // {spaceId: "hsv", coords: [25, 50, 75], alpha: 1}
	// colorA98RgbA: 'color(a98-rgb 0 1 .5)', // {spaceId: "a98rgb", coords: [0, 1, 0.5], alpha: 1}
	// colorA98RgbB: 'color(a98-rgb 0 100% 50%)', // {spaceId: "a98rgb", coords: [0, 1, 0.5], alpha: 1}
	// colorDisplayP3A: 'color(display-p3 0 1 .5)', // {spaceId: "p3", coords: [0, 1, 0.5], alpha: 1}
	// colorDisplayP3B: 'color(display-p3 0 1 0 / .5)', // {spaceId: "p3", coords: [0, 1, 0], alpha: 0.5}
	// colorDisplayP3C: 'color(display-p3 0% 100% 50%)', // {spaceId: "p3", coords: [0, 1, 0.5], alpha: 1}
	// colorDisplayP3D: 'color(display-p3 none 1 .5)', // {spaceId: "p3", coords: [null, 1, 0.5], alpha: 1}
	// colorProphotoRgbA: 'color(prophoto-rgb 0 1 .5)', // {spaceId: "prophoto", coords: [0, 1, 0.5], alpha: 1}
	// colorProphotoRgbB: 'color(prophoto-rgb 0 100% 50%)', // {spaceId: "prophoto", coords: [0, 1, 0.5], alpha: 1}
	// colorRec2020A: 'color(rec2020 0 1 .5)', // {spaceId: "rec2020", coords: [0, 1, 0.5], alpha: 1}
	// colorRec2020B: 'color(rec2020 0 100% 50%)', // {spaceId: "rec2020", coords: [0, 1, 0.5], alpha: 1}
	// colorSrgbA: 'color(srgb .9 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbB: 'color(srgb +0.9 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbC: 'color(srgb 0 1 .5)', // {spaceId: "srgb", coords: [0, 1, 0.5], alpha: 1}
	// colorSrgbD: 'color(srgb 0 100% 50%)', // {spaceId: "srgb", coords: [0, 1, 0.5], alpha: 1}
	// colorSrgbE: 'color(srgb 0.09e+1 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbF: 'color(srgb 0.09e1 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbG: 'color(srgb 9e-1 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbH: 'color(srgb 9E-1 0 0)', // {spaceId: "srgb", coords: [0.9, 0, 0], alpha: 1}
	// colorSrgbLinearA: 'color(srgb-linear 0 1 .5)', // {spaceId: "srgb-linear", coords: [0, 1, 0.5], alpha: 1}
	// colorSrgbLinearB: 'color(srgb-linear 0 100% 50%)', // {spaceId: "srgb-linear", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzA: 'color(xyz 0 1 .5)', // {spaceId: "xyz-d65", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzB: 'color(xyz 0 100% 50%)', // {spaceId: "xyz-d65", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzD50A: 'color(xyz-d50 0 1 .5)', // {spaceId: "xyz-d50", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzD50B: 'color(xyz-d50 0 100% 50%)', // {spaceId: "xyz-d50", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzD65A: 'color(xyz-d65 0 1 .5)', // {spaceId: "xyz-d65", coords: [0, 1, 0.5], alpha: 1}
	// colorXyzD65B: 'color(xyz-d65 0 100% 50%)', // {spaceId: "xyz-d65", coords: [0, 1, 0.5], alpha: 1}
	// funcHslA: 'hsl(-180, 50%, 50%)', // {spaceId: "hsl", coords: [-180, 50, 50], alpha: 1}
	// funcHslB: 'hsl(0.25turn 0% 0% / .5)', // {spaceId: "hsl", coords: [90, 0, 0], alpha: 0.5}
	// funcHslC: 'hsl(1.5707963267948966rad 0% 0% / .5)', // {spaceId: "hsl", coords: [90, 0, 0], alpha: 0.5}
	// funcHslD: 'hsl(100grad 0% 0% / .5)', // {spaceId: "hsl", coords: [90, 0, 0], alpha: 0.5}
	// funcHslE: 'hsl(180, 50%, 50%)', // {spaceId: "hsl", coords: [180, 50, 50], alpha: 1}
	// funcHslF: 'hsl(230.6 179.7% 37.56% / 1)', // {spaceId: "hsl", coords: [230.6, 179.7, 37.56], alpha: 1}
	// funcHslG: 'hsl(900, 50%, 50%)', // {spaceId: "hsl", coords: [900, 50, 50], alpha: 1}
	// funcHslH: 'hsl(90deg 0% 0% / .5)', // {spaceId: "hsl", coords: [90, 0, 0], alpha: 0.5}
	// funcHslI: 'hsl(none, 50%, 50%)', // {spaceId: "hsl", coords: [null, 50, 50], alpha: 1}
	// funcHsla: 'hsla(0, 0%, 100%, .5)', // {spaceId: "hsl", coords: [0, 0, 100], alpha: 0.5}
	// funcHwbA: 'hwb(180 20 30)', // {spaceId: "hwb", coords: [180, 20, 30], alpha: 1}
	// funcHwbB: 'hwb(180 20% 30%)', // {spaceId: "hwb", coords: [180, 20, 30], alpha: 1}
	// funcHwbC: 'hwb(none 20% 30%)', // {spaceId: "hwb", coords: [null, 20, 30], alpha: 1}
	// funcLabA: 'lab(100 -50 5 / .5)', // {spaceId: "lab", coords: [100, -50, 5], alpha: 0.5}
	// funcLabB: 'lab(100 -50 50)', // {spaceId: "lab", coords: [100, -50, 50], alpha: 1}
	// funcLabC: 'lab(100% 0 0)', // {spaceId: "lab", coords: [100, 0, 0], alpha: 1}
	// funcLabD: 'Lab(100% 0 0)', // {spaceId: "lab", coords: [100, 0, 0], alpha: 1}
	// funcLabE: 'lab(50% 25% -25% / 50%)', // {spaceId: "lab", coords: [50, 31.25, -31.25], alpha: 0.5}
	// funcLabF: 'lab(80 0 0)', // {spaceId: "lab", coords: [80, 0, 0], alpha: 1}
	// funcLchA: 'lch(100 50 450)', // {spaceId: "lch", coords: [100, 50, 450], alpha: 1}
	// funcLchB: 'lch(100 50 50)', // {spaceId: "lch", coords: [100, 50, 50], alpha: 1}
	// funcLchC: 'lch(100% 0 0)', // {spaceId: "lch", coords: [100, 0, 0], alpha: 1}
	// funcLchD: 'lch(50% 50% 50 / 50%)', // {spaceId: "lch", coords: [50, 75, 50], alpha: 0.5}
	// funcLchE: 'lch(90 0 none)', // {spaceId: "lch", coords: [90, 0, null], alpha: 1}
	// funcLchF: 'lch(calc(NaN) 10 50)', // {spaceId: "lch", coords: [NaN, 10, 50], alpha: 1}
	// funcLchG: 'lch(NaN 10 50)', // {spaceId: "lch", coords: [NaN, 10, 50], alpha: 1}
	// funcOklabA: 'oklab(1 -0.20 0.20)', // {spaceId: "oklab", coords: [1, -0.2, 0.2], alpha: 1}
	// funcOklabB: 'oklab(10 -0.80 0.80)', // {spaceId: "oklab", coords: [10, -0.8, 0.8], alpha: 1}
	// funcOklabC: 'oklab(100% 0 0 / 0.5)', // {spaceId: "oklab", coords: [1, 0, 0], alpha: 0.5}
	// funcOklabD: 'oklab(100% 0 0)', // {spaceId: "oklab", coords: [1, 0, 0], alpha: 1}
	// funcOklabE: 'OKLab(100% 0 0)', // {spaceId: "oklab", coords: [1, 0, 0], alpha: 1}
	// funcOklabF: 'oklab(42% 100% -50%)', // {spaceId: "oklab", coords: [0.42, 0.4, -0.2], alpha: 1}
	// funcOklchA: 'oklch(1 0  120 / none)', // {spaceId: "oklch", coords: [1, 0, 120], alpha: null}
	// funcOklchB: 'oklch(1 0 none)', // {spaceId: "oklch", coords: [1, 0, null], alpha: 1}
	// funcOklchC: 'oklch(1 0.2 50)', // {spaceId: "oklch", coords: [1, 0.2, 50], alpha: 1}
	// funcOklchD: 'oklch(10 2 500 / 10)', // {spaceId: "oklch", coords: [10, 2, 500], alpha: 1}
	// funcOklchE: 'oklch(100% 0 0 / 50%)', // {spaceId: "oklch", coords: [1, 0, 0], alpha: 0.5}
	// funcOklchF: 'oklch(100% 0 0)', // {spaceId: "oklch", coords: [1, 0, 0], alpha: 1}
	// funcOklchG: 'OKLch(100% 0 0)', // {spaceId: "oklch", coords: [1, 0, 0], alpha: 1}
	// funcOklchH: 'oklch(100% 0 30deg)', // {spaceId: "oklch", coords: [1, 0, 30], alpha: 1}
	// funcOklchI: 'oklch(100% 150% 50)', // {spaceId: "oklch", coords: [1, 0.6000000000000001, 50], alpha: 1}
	// funcOklchJ: 'oklch(100% 50% 50)', // {spaceId: "oklch", coords: [1, 0.2, 50], alpha: 1}
	// funcRgb: 'rgb(0 127.5 300 / .5)', // {spaceId: "srgb", coords: [0, 0.5, 1.1764705882352942], alpha: 0.5}
	// funcRgbaA: 'rgba(0, 127.5, 300, 0.5)', // {spaceId: "srgb", coords: [0, 0.5, 1.1764705882352942], alpha: 0.5}
	// funcRgbaB: 'rgba(0% 50% 200% / 0.5)', // {spaceId: "srgb", coords: [0, 0.5, 2], alpha: 0.5}
};

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
};

function prettyLabel(label: string): string {
	return label
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase());
}

const paneColorPlus = new Pane({
	container: document.querySelector<HTMLDivElement>('div#plus')!,
	title: 'Tweakpane Plugin Color Plus',
});
paneColorPlus.registerPlugin(TweakpanePluginColorPlus);

const paneColorOriginal = new Pane({
	container: document.querySelector<HTMLDivElement>('div#integrated')!,
	title: 'Tweakpane Integrated Color',
});

for (const key of Object.keys(params)) {
	paneColorPlus.addBinding(params, key, {
		view: 'color-plus',
		picker: 'inline',
		label: prettyLabel(key),
		...extraProps[key],
	});

	// Special case for unsupported tuples...
	if (Array.isArray(params[key])) {
		paneColorOriginal.addBinding(
			{
				value: `${String(params[key])} (Unsupported)`,
			},
			'value',
			{
				disabled: true,
				label: prettyLabel(key),
			},
		);
	} else {
		paneColorOriginal.addBinding(params, key, {
			view: 'color',
			picker: 'inline',
			label: prettyLabel(key),
			...extraProps[key],
		});
	}
}

paneColorPlus.on('change', () => {
	paneColorOriginal.refresh();
});

paneColorOriginal.on('change', () => {
	paneColorPlus.refresh();
});
