import * as culori from 'culori';

import {
	ColorComponents3,
	ColorComponents4,
	ColorMode,
	ColorType,
} from './color-model';

export function componentsToCulori(
	mode: ColorMode,
	components: ColorComponents3 | ColorComponents4,
): culori.Color {
	const definition = culori.getMode(mode);

	const culoriObject: Record<string, string | number> = {
		mode: mode,
	};

	culoriObject[definition.channels[0]] = components[0];
	culoriObject[definition.channels[1]] = components[1];
	culoriObject[definition.channels[2]] = components[2];

	// Alpha too TODO other approach or flag
	if (components.length === 4) {
		culoriObject[definition.channels[3]] = components[3];
	}

	return culoriObject as unknown as culori.Color;
}

export function culoriToComponents(
	c: culori.Color,
	colorType: ColorType,
	forceAlpha: true,
): ColorComponents4;
export function culoriToComponents(
	c: culori.Color,
	colorType: ColorType,
	forceAlpha?: false,
): ColorComponents3;
export function culoriToComponents(
	c: culori.Color,
	colorType: ColorType,
	forceAlpha = false,
): ColorComponents3 | ColorComponents4 {
	const {channels} = culori.getMode(c.mode);

	if ('alpha' in c || forceAlpha) {
		return [
			(c as unknown as Record<string, number>)[channels[0]] *
				(colorType === 'int' ? 255 : 1),
			(c as unknown as Record<string, number>)[channels[1]] *
				(colorType === 'int' ? 255 : 1),
			(c as unknown as Record<string, number>)[channels[2]] *
				(colorType === 'int' ? 255 : 1),
			(c as unknown as Record<string, number>)['alpha'] ?? 1,
		] as ColorComponents4;
	} else {
		return [
			(c as unknown as Record<string, number>)[channels[0]] *
				(colorType === 'int' ? 255 : 1),
			(c as unknown as Record<string, number>)[channels[1]] *
				(colorType === 'int' ? 255 : 1),
			(c as unknown as Record<string, number>)[channels[2]],
		] as ColorComponents3;
	}
}
