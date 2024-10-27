import {constrainRange, loopRange, Tuple3, Tuple4} from '@tweakpane/core';
import * as culori from 'culori';

import {componentsToCulori, culoriToComponents} from './color-model-culori';

export type ColorComponents3 = Tuple3<number>;
export type ColorComponents4 = Tuple4<number>;

export type ColorMode = 'hsl' | 'hsv' | 'rgb';
export type ColorType = 'float' | 'int';

export function removeAlphaComponent(
	comps: ColorComponents4,
): ColorComponents3 {
	return [comps[0], comps[1], comps[2]];
}

export function appendAlphaComponent(
	comps: ColorComponents3,
	alpha: number,
): ColorComponents4 {
	return [comps[0], comps[1], comps[2], alpha];
}

export function getColorMaxComponents(
	mode: ColorMode,
	type: ColorType,
): ColorComponents3 {
	return [
		type === 'float' ? 1 : mode === 'rgb' ? 255 : 360,
		type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
		type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
	];
}

function loopHueRange(hue: number, max: number): number {
	// Maximum value of the slider (e.g. 360deg) should be kept
	return hue === max ? max : loopRange(hue, max);
}

export function constrainColorComponents(
	components: ColorComponents3 | ColorComponents4,
	mode: ColorMode,
	type: ColorType,
): ColorComponents4 {
	const ms = getColorMaxComponents(mode, type);
	return [
		mode === 'rgb'
			? constrainRange(components[0], 0, ms[0])
			: loopHueRange(components[0], ms[0]),
		constrainRange(components[1], 0, ms[1]),
		constrainRange(components[2], 0, ms[2]),
		constrainRange(components[3] ?? 1, 0, 1),
	];
}

export function convertColorType(
	comps: ColorComponents3,
	mode: ColorMode,
	from: ColorType,
	to: ColorType,
): ColorComponents3 {
	const fms = getColorMaxComponents(mode, from);
	const tms = getColorMaxComponents(mode, to);
	return comps.map(
		(c, index) => (c / fms[index]) * tms[index],
	) as ColorComponents3;
}

export function convertColor(
	components: ColorComponents3,
	from: {mode: ColorMode; type: ColorType},
	to: {mode: ColorMode; type: ColorType},
): ColorComponents3 {
	const intComps = convertColorType(components, from.mode, from.type, 'int');

	const oldColor = componentsToCulori(from.mode, intComps);
	const newColor = culori.converter(from.mode)(oldColor, to.mode);

	return convertColorType(
		culoriToComponents(newColor, 'int'),
		to.mode,
		'int',
		to.type,
	);
}
