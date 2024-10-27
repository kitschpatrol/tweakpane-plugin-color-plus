import {Formatter} from '@tweakpane/core';
import type {Color as CuloriColor} from 'culori';
import {
	colorsNamed,
	differenceCiede2000,
	formatCss,
	formatHex,
	formatHex8,
	formatHsl,
	formatRgb,
	getMode,
	nearest,
	parse,
	round,
} from 'culori';

import type {Color} from '../model/color.js';
import type {ColorMode} from '../model/color-model.js';
import {
	componentsToCulori,
	culoriToComponents,
} from '../model/color-model-culori.js';
import {IntColor} from '../model/int-color.js';
import type {
	DetectionResult,
	StringColorFormat,
	StringColorNotation,
} from './color-string.js';

export function getColorStringNotation(
	value: string,
): StringColorNotation | null {
	// TODO handle more notation types with Culori
	// if (value.startsWith('#')) {
	// 	return 'hex';
	// }

	// TODO named
	// if (Object.keys(colorsNamed).includes(value.toLowerCase())) {
	// 	return 'named';
	// }

	if (value) {
		return 'css';
	}
	return 'css';
}

export function stringToCuloriColor(value: string): CuloriColor | undefined {
	// Trust in Culori...
	return parse(value);
}

function roundColuriColor(color: CuloriColor, precision?: number): CuloriColor {
	if (precision === undefined) {
		return color;
	}
	const {channels} = getMode(color.mode);
	const roundFunction = round(precision);

	for (const channel of channels) {
		(color as unknown as Record<string, number>)[channel] = roundFunction(
			(color as unknown as Record<string, number>)[channel],
		);
	}

	return color;
}

function formatCssModernFunctional(color: CuloriColor): string {
	// const {serialize} = getMode(color.mode);

	// TODO unsupported modes?
	if (color.mode === 'rgb') {
		const parts = formatRgb(color).replace('rgba', 'rgb').split(',');
		return parts.length === 3
			? `${parts[0]}${parts[1]}${parts[2]}`
			: `${parts[0]}${parts[1]}${parts[2]} /${parts[3]}`;
	}
	return formatCss(color);

	// return formatCss(color).replace(`color(${serialize} `, `${color.mode}(`);
}

export function culoriColorToString(
	color: CuloriColor,
	format: 'css' | 'hex' | 'named',
	forceAlpha: boolean = false,
	precision: number | undefined = 4,
): string {
	const sourceColor = {...color};

	if (forceAlpha) {
		sourceColor.alpha = sourceColor.alpha ?? 1;
	}

	switch (format) {
		// TODO right mix of overrides
		case 'css':
			return color.mode === 'rgb'
				? // TODO hmm what about rgb(0 0 0 / 0.5) ?
					formatCssModernFunctional(roundColuriColor(color, precision))
				: color.mode === 'hsl'
					? formatHsl(color)
					: color.mode === 'hsv'
						? formatHsv(color)
						: formatCss(color);
		case 'hex':
			return sourceColor.alpha !== undefined
				? formatHex8(color)
				: formatHex(color);
		case 'named':
			return nearest(Object.keys(colorsNamed), differenceCiede2000())(
				color,
				1,
			)[0]!;
	}
}

console.log(
	culoriColorToString({mode: 'hsv', h: 1, s: 0, v: 0, alpha: 0.5}, 'css', true),
);

function twoDecimals(value: number): string {
	return value.toFixed(2);
}

function clamp(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

function formatHsv(color: CuloriColor): string {
	if (color.mode !== 'hsv') {
		return '';
	}

	const h = twoDecimals(color.h || 0);
	const s = twoDecimals(clamp(color.s) * 100) + '%';
	const l = twoDecimals(clamp(color.v) * 100) + '%';

	if (color.alpha === undefined || color.alpha === 1) {
		// opaque color
		return `hsv(${h}, ${s}, ${l})`;
	} else {
		// transparent color
		return `hsva(${h}, ${s}, ${l}, ${twoDecimals(clamp(color.alpha))})`;
	}
}

// ------------------------

// For integration...

export function detectStringColorCulori(text: string): DetectionResult | null {
	const notation = getColorStringNotation(text);

	if (notation === null) {
		return null;
	}

	const parsedColor = parse(text);

	if (parsedColor === undefined) {
		return null;
	}

	const {alpha, mode} = parsedColor;

	// Ensure mode is supported
	if (mode !== 'rgb' && mode !== 'hsl' && mode !== 'hsv') {
		console.warn('Culori detected unsupported color mode:', mode);
		return null;
	}

	console.log(`Parsed color with Culori: ${JSON.stringify(parsedColor)}`);

	return {
		notation,
		mode: mode as ColorMode,
		alpha: alpha !== undefined ? true : false,
	};
}

export function findColorStringifierCulori(
	format: StringColorFormat,
): Formatter<Color> | null {
	if (format.notation === 'css') {
		const localFormat = format.notation as 'css';
		const localAlpha = format.alpha;

		return (color: Color): string => {
			console.log('----------------------------------');
			console.log(`Stringifying color with Culori: ${JSON.stringify(color)}`);
			console.log(`Format: ${JSON.stringify(format)}`);
			console.log(`Local format: ${localFormat}`);
			console.log(`Local alpha: ${localAlpha}`);
			const localColor = colorToCuloriColor(color, localAlpha);
			const stringifiedColor = culoriColorToString(
				localColor,
				localFormat,
				localAlpha,
			);
			console.log(stringifiedColor);
			return stringifiedColor;
		};
	} else {
		console.warn('Unsupported color notation:', format.notation);
		return null;
	}
}

function colorToCuloriColor(color: Color, alpha: boolean): CuloriColor {
	// TODO color type int / float?
	const [c1, c2, c3, a] = color.getComponents();
	return componentsToCulori(color.mode, alpha ? [c1, c2, c3, a] : [c1, c2, c3]);
}

export function parseCssColorInt(text: string): IntColor | null {
	const parsedColor = parse(text);

	if (parsedColor === undefined) {
		return null;
	}

	return new IntColor(
		culoriToComponents(parsedColor, 'int'),
		parsedColor.mode as unknown as ColorMode,
	);
}
