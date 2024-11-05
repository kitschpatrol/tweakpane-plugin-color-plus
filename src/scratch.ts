// import Color from 'colorjs.io';
// import {toGamutCSS} from 'colorjs.io/fn';

import {mapRange} from '@tweakpane/core';

import {
	ColorFormat,
	ColorPlusObject,
	ColorSpaceId,
	ColorType,
	getRangeForChannel,
	ObjectFormat,
	TupleFormat,
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

const colorObjectKeys: Array<{
	spaceId: ColorSpaceId;
	channels: Array<{internalKey: string; externalKeys: string[]}>;
}> = [
	/*
	 * [HSL](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
	 * Int example: `{h: 270, s: 100, l: 80, a: .25}`
	 * Float example: `{h: .75, s: 1, l: .8, a: .25}`
	 */
	{
		spaceId: 'hsl',
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
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
	/*
	 * HSV
	 * Also handles HSB, which is identical to HSV. Photoshop uses HSB.
	 * Int example: `{h: 270, s: 100, v: 80, a: .25}`
	 * Float example: `{h: .75, s: 1, v: .8, a: .25}`
	 */
	{
		spaceId: 'hsv',
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
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
	/*
	 * [HWB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hwb)
	 * Int example: `{h:, w: 100, b: 80, a: .25}`
	 * Float example: `{h: .75, w: 1, b: .8, a: .25}`
	 */
	{
		spaceId: 'hwb',
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
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
	/*
	 * [Lab](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lab)
	 * Int example: `{l: 25, a: -50, b: 100, a: .25}`
	 * Float example: `{l: .25, a: .3, b: .9, a: .25}`
	 */
	{
		spaceId: 'lab',
		channels: [
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
			},
			{
				internalKey: 'a',
				externalKeys: ['a', 'green-red', 'greenred', 'gr'],
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blue-yellow', 'blueyellow', 'by'],
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
	/*
	 * [LCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch)
	 * Int example: `{l: 25, c: 50, h: 270, a: .25}`
	 * Float example: `{l: .25, c: .5, h: .33, a: .25}`
	 */
	{
		spaceId: 'lch',
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
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
	/*
	 * [RGB](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb)
	 * Int example: `{r: 255, g: 0, b: 0, a: .5 }`
	 * Float example: `{r: 1, g: 0, b: 0, a: .5}`
	 */
	{
		spaceId: 'srgb',
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
				externalKeys: ['a', 'alpha', 'opacity'],
			},
		],
	},
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
	if (!isRecord(value)) return false;
	return Object.values(value).every(
		(v) => typeof v === 'number' && Number.isFinite(v), // This ensures we reject Infinity, -Infinity, and NaN
	);
}

function objectToColor(
	value: unknown,
	colorType: ColorType,
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	if (!isNumberRecord(value)) return undefined;

	const lowerCaseValue = Object.fromEntries(
		Object.entries(value).map(([k, v]) => [k.toLowerCase(), v]),
	);

	const inputKeys = new Set(
		Object.keys(lowerCaseValue).map((k) => k.toLowerCase()),
	);

	for (const objectKeys of colorObjectKeys) {
		const {spaceId, channels} = objectKeys;

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
			const colorFormat: ColorFormat = {
				type: 'object',
				format: {
					colorType: colorType,
					coordKeys: ['', '', ''], // Will be overwritten
					alphaKey: undefined, // May be overwritten
				},
				alpha: false, // May be overwritten
				space: spaceId,
			};

			const result: ColorPlusObject = {
				spaceId: spaceId,
				coords: [0, 0, 0],
				alpha: 1,
			};

			// Process regular channels
			regularChannels.forEach((channel, index) => {
				const matchingKey = channel.externalKeys.find((key) =>
					inputKeys.has(key.toLowerCase()),
				);

				if (matchingKey) {
					const channelValue = lowerCaseValue[matchingKey.toLowerCase()]!;
					(colorFormat.format as ObjectFormat).coordKeys[index] = matchingKey;
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
					(colorFormat.format as ObjectFormat).alphaKey = alphaKey;
					colorFormat.alpha = true;
					result.alpha = lowerCaseValue[alphaKey.toLowerCase()]!;
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
						if ((colorFormat.format as ObjectFormat).colorType === 'int') {
							result.coords[index] = mapRange(
								value,
								0,
								255,
								colorJsLow, // 0
								colorJsHigh, // 1
							);
						}
					} else if (
						(colorFormat.format as ObjectFormat).colorType === 'float'
					) {
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
				format: colorFormat,
			};
		}
	}

	return undefined;
}

function colorToObject(
	color: ColorPlusObject,
	format: ColorFormat,
): undefined | Record<string, number> {
	const objectFormat = format.format as ObjectFormat;

	if (format.type !== 'object') {
		console.warn(`Invalid format type: ${format.type}`);
		return undefined;
	}

	if (!colorObjectKeys.some((keys) => keys.spaceId === format.space)) {
		console.warn(`Invalid color space for object conversion: ${format.space}`);
		return undefined;
	}

	const result: Record<string, number> = {};
	// TODO convert color space

	// Map between float and int if needed
	for (const [index, value] of color.coords.entries()) {
		if (value !== null) {
			const [colorJsLow, colorJsHigh] = getRangeForChannel(format.space, index);

			if (format.space === 'srgb') {
				if (objectFormat.colorType === 'int') {
					result[objectFormat.coordKeys[index]] = mapRange(
						value,
						colorJsLow,
						colorJsHigh,
						0,
						255,
					);
				}
			} else if (objectFormat.colorType === 'float') {
				result[objectFormat.coordKeys[index]] = mapRange(
					value,
					colorJsLow,
					colorJsHigh,
					0,
					1,
				);
			}
		}
	}

	if (format.alpha && objectFormat.alphaKey !== undefined) {
		result[objectFormat.alphaKey] = color.alpha;
	}

	return result;
}

const {color, format} = objectToColor({r: 255, g: 128, b: 0, a: 0.5}, 'int')!;
console.log(color);
console.log(format);
console.log(colorToObject(color, format));

function tupleToColor(
	value: unknown,
	colorType: ColorType,
):
	| undefined
	| {
			color: ColorPlusObject;
			format: ColorFormat;
	  } {
	if (!Array.isArray(value)) {
		return undefined;
	}

	// Ensure all values are numbers or null...
	if (
		!value.every(
			(v) => v === null || (typeof v === 'number' && Number.isFinite(v)),
		)
	) {
		console.warn('Invalid tuple values');
		return undefined;
	}

	if (!(value.length === 3 || value.length === 4)) {
		console.warn(`Invalid tuple length: ${value.length}`);
	}

	return {
		color: {
			spaceId: 'srgb',
			coords: [
				value[0] === null
					? null
					: colorType === 'int'
						? value[0] / 255
						: value[0],
				value[1] === null
					? null
					: colorType === 'int'
						? value[1] / 255
						: value[1],
				value[2] === null
					? null
					: colorType === 'int'
						? value[2] / 255
						: value[2],
			],
			alpha: value.length === 4 ? value[3] : 1,
		},
		format: {
			alpha: value.length === 4,
			type: 'tuple',
			space: 'srgb',
			format: {
				colorType: colorType,
			},
		},
	};
}

type ColorTupleRgb = [number | null, number | null, number | null];
type ColorTupleRgba = [number | null, number | null, number | null, number];

function colorToTuple(
	color: ColorPlusObject,
	format: ColorFormat,
): undefined | ColorTupleRgb | ColorTupleRgba {
	if (format.type !== 'tuple') {
		console.warn(`Invalid format type: ${format.type}`);
		return undefined;
	}

	const {colorType} = format.format as TupleFormat;

	// TODO convert space

	const result = [
		color.coords[0] === null
			? null
			: color.coords[0] * (colorType === 'int' ? 255 : 1),
		color.coords[1] === null
			? null
			: color.coords[1] * (colorType === 'int' ? 255 : 1),
		color.coords[2] === null
			? null
			: color.coords[2] * (colorType === 'int' ? 255 : 1),
	];

	if (format.alpha) {
		return [...result, color.alpha] as ColorTupleRgba;
	} else {
		return result as ColorTupleRgb;
	}
}

const {color: tupleColor, format: tupleFormat} = tupleToColor(
	[255, 128, 0, 0.5],
	'int',
)!;

console.log('----------------------------------');
console.log(tupleColor);
console.log(tupleFormat);
console.log(colorToTuple(tupleColor, tupleFormat));

function numberToColor(
	value: unknown,
	alpha: boolean,
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined;
	}

	if (value < 0 || value > 0xffffffff) {
		console.warn(`Invalid number value: ${value}`);
		return undefined;
	}

	// Determine if number has alpha channel
	// TODO use string parsing...

	return {
		color: {
			spaceId: 'srgb',
			coords: [colorJs.r, colorJs.g, colorJs.b],
			alpha: colorJs.alpha,
		},
		format: {
			alpha: colorJs.alpha < 1,
			type: 'number',
			space: 'srgb',
			format: {
				colorType: colorType,
			},
		},
	};
}

function colorToNumber(
	color: ColorPlusObject,
	format: ColorFormat,
): undefined | number {
	if (format.type !== 'number') {
		console.warn(`Invalid format type: ${format.type}`);
		return undefined;
	}

	// TODO convert space

	// TODO
	return 0;
}

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
