// import Color from 'colorjs.io';
// import {toGamutCSS} from 'colorjs.io/fn';

import {constrainRange, mapRange} from '@tweakpane/core';

import {
	ColorPlusObject,
	ColorType,
	getColorJsColorSpaceById,
	getRangeForChannel,
} from './model/color-plus';
// // const color = new Color('#ff00ff');

// // console.log(color);
// // console.log('----------------------------------');
// // console.log(color.to('srgb')); // #ff0000
// // console.log('----------------------------------');
// // const q = new Color('rgb(300, 300, 300 / .5)');

// // console.log(q.h);
// // console.log(q.s);
// // console.log(q.v);

// // console.log(q.toString());

// // const c = ColorPlus.create('#f00')!;
// // const f = ColorPlus.getFormat('#f00');

// // console.log(c.serialize(f!));
// // console.log(c.get('h', 'hsv'));
// // c.set('h', 361, 'hsv');
// // console.log('h');
// // console.log(c.get('h', 'hsv'));

// // c.set(
// // 	'h',
// // 	(value) => {
// // 		console.log(value);
// // 		return value + 60;
// // 	},
// // 	'hsv',
// // );

// // console.log(c.get('h', 'hsv'));

// // c.alpha = 0.5;

// // console.log(c?.serialize({format: 'rgba', alpha: true, space: 'srgb'}));

// // // console.log(ColorPlus.create('#f00c', 'never')?.serialize());
// // // console.log(ColorPlus.create('#ff0000')?.serialize());
// // // console.log(ColorPlus.create('#ff00ff')?.serialize());
// // // console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// // // console.log(ColorPlus.create('rgb(255, 0, 255)', 'auto')?.serialize());
// // // console.log(ColorPlus.create('rgba(255, 0, 255, 1)')?.serialize());
// // // console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// // // console.log(ColorPlus.create('rgb(255 1 1)')?.serialize());
// // // console.log(ColorPlus.create('rgb(255 255 255 / 1)', 'never')?.serialize());
// // // console.log(ColorPlus.create('rgb(255 255 255 / 10%)')?.serialize());
// // // console.log(ColorPlus.create('rgb(255, 255, 255)', 'auto')?.serialize());

// // console.log('----------------------------------');
// // const d = ColorPlus.create('rgb(300, 300, 300 / .5)')!;
// // const df = ColorPlus.getFormat('rgb(300, 300, 300 / .5)');
// // d.set('r', 800);

// // console.log(d.getAll());
// // console.log(d.serialize(df!));

// // console.log('----------------------------------');
// // let e = new Color('rgb(900, 300, 300 / .5)');

// // e = e.to('hsl');
// // e.h = 370;
// // e.toGamut({
// // 	method: 'clip',
// // });

// // console.log('----------------------------------');
// // console.log('----------------------------------');
// // const nv = 0xff00ff;
// // const n = ColorPlus.create(nv);
// // const nf = ColorPlus.getFormat(nv);

// // console.log(nv);
// // console.log('----------------------------------');
// // const v = n?.toValue(nf!);
// // console.log(n?.serialize(nf!));
// // console.log(v);
// // console.log(typeof n?.serialize(nf!));
// // console.log(typeof n?.toValue(nf!));

// // const p = ColorPlus.create(0xff00ffcc);
// // const pf = ColorPlus.getFormat(0xff00ffcc);
// // console.log(p);

// // console.log(p?.toValue(pf!));
// // p?.convert('hsv');
// // console.log(p?.toValue(pf!));
// // p?.convert('srgb');
// // console.log(p?.toValue(pf!));

// // console.log(p?.serialize(pf!));

// // console.log('----------------------------------');
// // console.log(getRangeForChannel('hsv', 0));
// // console.log(getRangeForChannel('hsl', 0));

// const a = ColorPlus.create('oklch(4% none 520deg)');
// console.log(a?.toString());
// const f = ColorPlus.getFormat('oklch(4% none 520deg)');
// a!.convert('hsv');
// console.log(a?.toString());
// a!.toGamut('srgb');
// console.log(a?.toString());
// console.log(a?.serialize(f!));

type ObjectColorModes = 'hsl' | 'hsv' | 'hwb' | 'lab' | 'lch' | 'srgb';

type ObjectFormat = {
	space: ObjectColorModes;
	colorType: ColorType;
	coordKeys: [string, string, string];
	alphaKey: string | undefined; // undefined if no alpha
};

type Channel = {
	internalKey: string;
	externalKeys: string[];
};

interface ObjectColorFormat {
	space: ObjectColorModes;
	channels: Channel[];
}

const colorObjectFormats: ObjectColorFormat[] = [
	/*
	 * [HSL](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
	 * External int example: `{h: 270 (0-360°), s: 100 (0-100%), l: 80 (0-100%), a: 25 (0-100%)}`
	 * External float example: `{h: .75, s: 1, l: .8, a: .25}`
	 * Internal example: `{h: 270 (0-360°), s: 1, l: 0.8, alpha: 0.25}`
	 */
	{
		space: 'hsl',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
			},
			{
				internalKey: 's',
				externalKeys: ['s', 'saturation'],
			},
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
	/*
	 * [HSV]()
	 * Also handles HSV, which is identical to HSB. Photoshop uses HSB.
	 * External int example: `{h: 270 (0-360°), s: 100 (0-100%), v: 80 (0-100%), a: 25 (0-100%)}`
	 * External float example: `{h: .75, s: 1, v: .8, a: .25}`
	 * Internal example: `{h: 270 (0-360°), s: 1, v: 0.8, alpha: 0.25}`
	 */
	{
		space: 'hsv',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
			},
			{
				internalKey: 's',
				externalKeys: ['s', 'saturation'],
			},
			{
				internalKey: 'v',
				externalKeys: ['b', 'brightness', 'v', 'value'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
	/*
	 * [HWB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hwb)
	 * External int example: `{h: 270 (0-360°), w: 100 (0-100%), b: 80 (0-100%), a: 25 (0-100%)}`
	 * External float example: `{h: 0.75, w: 1, b: 0.8, a: 0.25}`
	 * Internal example: `{h: 270 (0-360°), w: 1, b: 0.8, alpha: 0.25}`
	 */
	{
		space: 'hwb',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
			},
			{
				internalKey: 'w',
				externalKeys: ['w', 'whiteness'],
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blackness'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
	/*
	 * [Lab](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lab)
	 * External int example: `{l: 25 (0-100), a: -50 (-125-125), b: 100 (-125-125), a: 25 (0-100%)}`
	 * External float example: `{l: 0.25, a: 0.3, b: 0.9, a: 0.25}`
	 * Internal example: `{l: 25, a: -50, b: 100, alpha: 0.25}`
	 */
	{
		space: 'lab',
		channels: [
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
			},
			{
				internalKey: 'a',
				externalKeys: ['a', 'green-red'],
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blue-yellow'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
	/*
	 * [LCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch)
	 * External int example: `{l: 25 (0-100), c: 50 (0-150), h: 270 (0-360°), a: 25 (0-100%)}`
	 * External float example: `{l: 0.25, c: 0.5, h: 0.33, a: 0.25}`
	 * Internal example: `{l: 25, c: 50, h: 270, alpha: 0.5}`
	 */
	{
		space: 'lch',
		channels: [
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
			},
			{
				internalKey: 'c',
				externalKeys: ['c', 'chroma'],
			},
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
	/*
	 * [RGB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb)
	 * External int example: `{r: 255 (0-255), g: 0 (0-255), b: 0 (0-255), a: 128 (0-255) }`
	 * External float example: `{r: 1, g: 0, b: 0, a: 0.5}`
	 * Internal example:  `{r: 1, g: 0, b: 0, a: 0.5}`
	 */
	{
		space: 'srgb',
		channels: [
			{
				internalKey: 'r',
				externalKeys: ['r', 'red'],
			},
			{
				internalKey: 'g',
				externalKeys: ['g', 'green'],
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blue'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
			},
		],
	},
];

function isRecord(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function isNumberRecord(obj: unknown): obj is Record<string, number> {
	if (!isRecord(obj)) return false;
	return Object.values(obj).every(
		(v) => typeof v === 'number' && Number.isFinite(v), // This ensures we reject Infinity, -Infinity, and NaN
	);
}

function objectToColor(
	obj: unknown,
	colorType: ColorType = 'int',
): {color: ColorPlusObject; format: ObjectFormat} | undefined {
	if (!isNumberRecord(obj)) return undefined;

	const value = Object.fromEntries(
		Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
	);

	const inputKeys = new Set(Object.keys(value).map((k) => k.toLowerCase()));

	for (const format of colorObjectFormats) {
		const {space: mode, channels} = format;

		// Split channels into regular and alpha channels
		const regularChannels = channels.filter((c) => c.internalKey !== 'alpha');
		const alphaChannel = channels.find((c) => c.internalKey === 'alpha');

		// Check if all required (non-alpha) channels are present
		const hasAllRequiredChannels = regularChannels.every((channel) =>
			channel.externalKeys.some((key) => inputKeys.has(key.toLowerCase())),
		);

		// Check if all input keys map to valid channels (including alpha)
		const allInputKeysValid = [...inputKeys].every((inputKey) =>
			channels.some((channel) =>
				channel.externalKeys.some((key) => key.toLowerCase() === inputKey),
			),
		);

		if (hasAllRequiredChannels && allInputKeysValid) {
			const objectFormat: ObjectFormat = {
				colorType: colorType,
				coordKeys: ['', '', ''], // Will be overwritten
				alphaKey: undefined, // May be overwritten
				space: mode,
			};

			const result: ColorPlusObject = {
				spaceId: mode,
				coords: [0, 0, 0],
				alpha: 1,
			};

			// Process regular channels
			regularChannels.forEach((channel, index) => {
				const matchingKey = channel.externalKeys.find((key) =>
					inputKeys.has(key.toLowerCase()),
				);

				if (matchingKey) {
					const channelValue = value[matchingKey.toLowerCase()]!;
					objectFormat.coordKeys[index] = matchingKey;
					result.coords[index] = channelValue;
				}
			});

			// Handle alpha channel separately
			if (alphaChannel) {
				const alphaKey = alphaChannel.externalKeys.find((key) =>
					inputKeys.has(key.toLowerCase()),
				);

				if (alphaKey) {
					// Alpha value provided
					objectFormat.alphaKey = alphaKey;
					result.alpha = value[alphaKey.toLowerCase()]!;
				}
			}

			// Map between float and int if needed
			for (const [index, value] of result.coords.entries()) {
				if (value !== null) {
					const [colorJsLow, colorJsHigh] = getRangeForChannel(
						result.spaceId,
						index,
					);

					// SRGB is the only supported space that's represented with 0-1 internally by ColorJS
					if (result.spaceId === 'srgb') {
						if (objectFormat.colorType === 'int') {
							result.coords[index] = mapRange(
								value,
								0,
								255,
								colorJsLow, // 0
								colorJsHigh, // 1
							);
						}
					} else if (objectFormat.colorType === 'float') {
						result.coords[index] = mapRange(
							value,
							0,
							1,
							colorJsLow,
							colorJsHigh,
						);
					}
				}
			}

			return {
				color: result,
				format: objectFormat,
			};
		}
	}

	return undefined;
}

function colorToObject(
	color: ColorPlusObject,
	format: ObjectFormat,
): Record<string, number> {
	const {space, coordKeys, alphaKey} = format;
	const {coords, alpha} = color;

	const result: Record<string, number> = {};
	// TODO convert color space

	// Map between float and int if needed
	for (const [index, value] of coords.entries()) {
		if (value !== null) {
			const [colorJsLow, colorJsHigh] = getRangeForChannel(space, index);

			if (format.space === 'srgb') {
				if (format.colorType === 'int') {
					result[coordKeys[index]] = mapRange(
						value,
						colorJsLow,
						colorJsHigh,
						0,
						255,
					);
				}
			} else if (format.colorType === 'float') {
				result[coordKeys[index]] = mapRange(
					value,
					colorJsLow,
					colorJsHigh,
					0,
					1,
				);
			}
		}
	}

	if (alphaKey !== undefined) {
		result[alphaKey] = alpha;
	}

	return result;
}

console.log('----------------------------------');
const {color, format} = objectToColor(
	{h: 0.1, s: 0.5, v: 0.2, alpha: 0.5},
	'float',
)!;
console.log(color);
console.log(colorToObject(color, format));

console.log('----------------------------------');

// function modeForKeys(keys: string[]): ObjectColorModes | undefined {
// 	const lowerKeys = keys.map((key) => key.toLowerCase());

// 	for (const format of colorObjectFormats) {
// 		const {space: mode, channels} = format;

// 		const hasAllChannels =
// 			channels.every((channel) =>
// 				channel.externalKeys.some((key) =>
// 					lowerKeys.includes(key.toLowerCase()),
// 				),
// 			) &&
// 			lowerKeys.every((inputKey) =>
// 				channels.some((channel) =>
// 					channel.externalKeys.some((key) => key.toLowerCase() === inputKey),
// 				),
// 			);

// 		if (hasAllChannels) {
// 			return mode;
// 		}
// 	}

// 	return undefined;
// }

// Usage examples:
// console.log(objectToColor({r: 255, g: 128, b: 0, a: 255})); // valid
// console.log(objectToColor({r: 255, g: 128, blue: 0, ALPHA: 255})); // valid
// console.log(objectToColor({r: 255, g: 128, b: 0, a: 255, extra: 1})); // invalid
// console.log(objectToColor({r: '255', g: 128, b: 0})); // invalid - string value
// console.log(objectToColor(null)); // invalid
// console.log(objectToColor([255, 128, 0])); // invalid - array
// console.log(objectToColor({r: 255, g: 128, b: NaN})); // invalid - NaN
// console.log(objectToColor({r: 255, g: 128, b: Infinity})); // invalid - Infinity

// function roundTo(value: number, decimals: number): number {
// 	const multiplier = 10 ** decimals;
// 	return Math.round(value * multiplier) / multiplier;
// }

// function colorToObject(
// 	color: Color,
// 	keys: string[],
// 	isFloat: boolean = false,
// 	precision: number | undefined = 3,
// ): Record<string, number> | undefined {
// 	// Infer the target color mode based on the keys in the destination object
// 	const targetMode = modeForKeys(keys);
// 	if (!targetMode) {
// 		return undefined;
// 	}

// 	// Convert the source color to the target implied by the object keys if needed
// 	const sourceColor =
// 		color.mode === targetMode
// 			? {...color}
// 			: culori.converter(color.mode)({...color});

// 	// Always have alpha, in case the destination object has an alpha key and the source does not
// 	sourceColor.alpha = sourceColor.alpha ?? 1;

// 	// Find the format configuration for the target mode
// 	const targetFormat = colorObjectFormats.find(
// 		(format) => format.mode === targetMode,
// 	);

// 	if (!targetFormat) {
// 		return undefined;
// 	}

// 	const colorObject: Record<string, number> = {};

// 	// Process each requested key
// 	for (const key of keys) {
// 		const lowerKey = key.toLowerCase();

// 		// Find the channel that matches this key
// 		const channel = targetFormat.channels.find((c) =>
// 			c.externalKeys.some((k) => k.toLowerCase() === lowerKey),
// 		);

// 		if (!channel) {
// 			return undefined;
// 		}

// 		const rawValue: number = sourceColor[
// 			channel.internalKey as keyof Color
// 		] as number;

// 		let value: number;
// 		if (isFloat) {
// 			value = channel.toFloat ? channel.toFloat(rawValue) : rawValue;
// 		} else {
// 			value = channel.toInt ? channel.toInt(rawValue) : rawValue;
// 		}

// 		if (precision !== undefined) {
// 			value = roundTo(value, precision);
