import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite';

const params: Record<string, unknown> = {
	hexString: '#ff0066',
	hexStringAlpha: '#ff00667f',
	oklchString: 'oklch(60% 0.26 11deg)',
	oklchStringAlpha: 'oklch(60% 0.26 11deg / 50%)',
	number: 0xff0066,
	numberAlpha: 0xff00667f,
	object: {
		r: 255,
		g: 0,
		b: 102,
	},
	// objectLongKeys: {
	// 	red: 255,
	// 	green: 0,
	// 	blue: 102,
	// },
	objectAlpha: {
		r: 255,
		g: 0,
		b: 102,
		a: 0.5,
	},
	objectFloat: {
		r: 1,
		g: 0,
		b: 0.4,
	},
	objectFloatAlpha: {
		r: 1,
		g: 0,
		b: 0.4,
		a: 0.5,
	},
	tuple: [255, 0, 102],
	tupleAlpha: [255, 0, 102, 0.5],
	tupleFloat: [1, 0, 0.4],
	tupleFloatAlpha: [1, 0, 0.4, 0.5],
	colorPrefixHsv: 'color(--hsv 336deg 100% 100)',
	colorA98Rgb: 'color(a98-rgb 0.86 0 0.39)',
	colorDisplayP3: 'color(display-p3 0.92 0.2 0.41)',
	colorProphotoRgb: 'color(prophoto-rgb 0.72 0.28 0.33)',
	colorRec2020: 'color(rec2020 0.8 0.23 0.35)',
	colorSrgb: 'color(srgb 1 0% 40%)',
	colorSrgbLinear: 'color(srgb-linear 1 0 0.13)',
	colorXyz: 'color(xyz 0.44 0.22 0.15)',
	colorXyzD50: 'color(xyz-d50 0.46 0.23% 0.11%)',
	colorXyzD65B: 'color(xyz-d65 0.44 0.22 0.15)',
	// funcHslE: 'hsl(180, 50%, 50%)',
	// funcHslB: 'hsl(0.25turn 0% 0% / .5)',
	// funcHsla: 'hsla(0, 0%, 100%, .5)',
	// funcHwbB: 'hwb(180 20% 30%)',
	// funcLabC: 'lab(100% 0 0)',
	// funcLchA: 'lch(100 50 450)',
	// funcOklabA: 'oklab(1 -0.20 0.20)',
	// funcRgb: 'rgb(0 127.5 300 / .5)',
	// funcRgbaA: 'rgba(0, 127.5, 300, 0.5)',
	// funcRgbaB: 'rgba(0% 50% 200% / 0.5)',
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
