import {mapRange} from '@tweakpane/core';

import {
	ColorFormat,
	ColorPlusObject,
	ColorSpaceId,
	ColorType,
	convert,
	formatNumber,
	getRangeForChannel,
	ObjectFormat,
} from './shared';

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

function isNumberRecord(
	value: unknown,
): value is Record<string, number | null> {
	if (!isRecord(value)) return false;
	return Object.values(value).every((v) => v === null || typeof v === 'number');
}

/**
 * @param value Accepts objects or object-like strings, e.g. `'{r: 255, g: 0, b: 0, a: .5 }'`
 * @param colorType
 * @returns
 */
export function objectToColor(
	value: unknown,
	colorType: ColorType,
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	// Handle object-like strings, too
	const objectValue =
		typeof value === 'string' ? (parseObjectString(value) ?? value) : value;

	if (!isNumberRecord(objectValue)) return undefined;

	const lowerCaseValue = Object.fromEntries(
		Object.entries(objectValue).map(([k, v]) => [k.toLowerCase(), v]),
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
						} else {
							result.coords[index] = value;
						}
					} else {
						if ((colorFormat.format as ObjectFormat).colorType === 'float') {
							result.coords[index] = mapRange(
								value,
								0,
								1,
								colorJsLow,
								colorJsHigh,
							);
						} else {
							result.coords[index] = value;
						}
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

export function colorToObject(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): undefined | Record<string, number | null> {
	// TODO proper type guard
	const objectFormat = format.format as ObjectFormat;

	if (format.type !== 'object') {
		console.warn(`Invalid format type: ${format.type}`);
		return undefined;
	}

	if (!colorObjectKeys.some((keys) => keys.spaceId === format.space)) {
		console.warn(`Invalid color space for object conversion: ${format.space}`);
		return undefined;
	}

	const result: Record<string, number | null> = {};

	const convertedColor = convert(color, format.space) ?? color;

	// Map between float and int if needed
	for (const [index, value] of convertedColor.coords.entries()) {
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
				} else {
					result[objectFormat.coordKeys[index]] = value;
				}
			} else {
				if (objectFormat.colorType === 'float') {
					result[objectFormat.coordKeys[index]] = mapRange(
						value,
						colorJsLow,
						colorJsHigh,
						0,
						1,
					);
				} else {
					result[objectFormat.coordKeys[index]] = value;
				}
			}
		}
	}

	if ((alphaOverride ?? format.alpha) && objectFormat.alphaKey !== undefined) {
		result[objectFormat.alphaKey] = convertedColor.alpha;
	}

	return result;
}

export function colorToObjectString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	const object = colorToObject(color, format, alphaOverride);

	if (object === undefined) {
		return undefined;
	}

	const precision = (format.format as ObjectFormat).colorType === 'int' ? 0 : 3;
	const precisionAlpha = 3;
	return stringifyObject(object, precision, precisionAlpha);
}

function stringifyObject(
	object: Record<string, number | null>,
	precision: number,
	precisionAlpha: number,
): string {
	const parts: string[] = [];
	let index = 0;
	for (const [key, value] of Object.entries(object)) {
		parts.push(
			`${key}: ${value === null ? 'null' : formatNumber(value, index === 3 ? precisionAlpha : precision)}`,
		);
		index++;
	}
	return `{${parts.join(', ')}}`;
}

/**
 * Takes a semi-naive JSON5-esque color-like string object, and attempts to parse it into an object
 * If the bespoke parse pass fails, it will try to use `JSON.parse` instead.
 */
function parseObjectString(value: string): Record<string, unknown> | undefined {
	try {
		return JSON.parse(value);
	} catch {
		// Manual parse
		// Strip certain characters and trim whitespace
		const parts = value
			.replace(/[%{}:,"']/g, '')
			.split(' ')
			.map((part) => part.trim())
			.filter((part) => part !== '');

		// Must have even number of parts to parse manually
		if (parts.length % 2 !== 0) {
			return undefined;
		}

		const object: Record<string, unknown> = {};

		for (let i = 0; i < parts.length - 1; i += 2) {
			const key = parts[i];
			if (typeof key !== 'string') {
				return undefined;
			}

			const value = parts[i + 1];

			if (value === 'null') {
				object[key] = null;
			} else {
				const number = parseFloat(value);
				if (Number.isNaN(number)) {
					return undefined;
				}
				object[key] = number;
			}
		}

		return object;
	}
}
