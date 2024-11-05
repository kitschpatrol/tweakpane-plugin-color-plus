import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite';

const params: Record<string, unknown> = {
	hexString: '#ff00ff',
	hexStringAlpha: '#ff00ffcc',
	oklchString: 'oklch(65% 0.26 357deg)',
	oklchStringAlpha: 'oklch(65% 0.26 357deg / 50%)',
	number: 0xff00ff,
	numberAlpha: 0xff00ffcc,
	object: {
		r: 255,
		g: 0,
		b: 255,
	},
	objectAlpha: {
		r: 255,
		g: 0,
		b: 255,
		a: 0.5,
	},
	objectFloat: {
		r: 1,
		g: 0,
		b: 1,
	},
	objectFloatAlpha: {
		r: 1,
		g: 0,
		b: 1,
		a: 0.5,
	},
	tuple: [255, 0, 255],
	tupleAlpha: [255, 0, 255, 0.25],
	tupleFloat: [1, 0, 1],
	tupleFloatAlpha: [1, 0, 1, 0.25],
	// typedArray: new Float32Array(4).fill(0.5),
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
