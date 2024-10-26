import type {Color as InternalColor} from 'culori';
import {
	colorsNamed,
	differenceCiede2000,
	formatCss,
	formatHex,
	formatHex8,
	formatHsl,
	formatRgb,
	nearest,
	parse,
} from 'culori';

type ColorStringStyles = 'css' | 'hex' | 'named';

export function getColorStringStyle(
	value: string,
): ColorStringStyles | undefined {
	if (value.startsWith('#')) {
		return 'hex';
	}

	if (Object.keys(colorsNamed).includes(value.toLowerCase())) {
		return 'named';
	}

	return 'css';
}

export function stringToInternalColor(
	value: string,
): InternalColor | undefined {
	// Trust in Culori...
	return parse(value);
}

export function internalColorToString(
	color: InternalColor,
	format: 'css' | 'hex' | 'named',
	forceAlpha: boolean = false,
): string {
	const sourceColor = {...color};

	if (forceAlpha) {
		sourceColor.alpha = sourceColor.alpha ?? 1;
	}

	switch (format) {
		// TODO right mix of overrides
		case 'css':
			return color.mode === 'rgb'
				? formatRgb(color)
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
			).at(0)!;
	}
}

console.log(
	internalColorToString(
		{mode: 'hsv', h: 1, s: 0, v: 0, alpha: 0.5},
		'css',
		true,
	),
);

function twoDecimals(value: number): string {
	return value.toFixed(2);
}

function clamp(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

function formatHsv(color: InternalColor): string {
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
