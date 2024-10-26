// New stuff for Color Plus
// TODO, type signature for object... very tricky

import type {Color as InternalColor} from 'culori';
import {converter} from 'culori/fn';

type Channel = {
	/** Canonical Culori color channel key */
	internalKey: string;
	/** Keys to associate with this Culori channel in an external object, effectively work as aliases to acommodate various object shapes */
	externalKeys: string[];
	/** How to convert from an external object's float value to a Culori internal value */
	fromFloat?: (value: number) => number;
	/** How to convert from an external object's integer value to a Culori internal value */
	fromInt?: (value: number) => number;
	/** How to convert from Culori's internal value to an external integer object value */
	toInt?: (value: number) => number;
	/** How to convert from Culori's internal value to an external float object value */
	toFloat?: (value: number) => number;
};

type ObjectColorModes = 'hsl' | 'hsv' | 'hwb' | 'lab' | 'lch' | 'rgb';

type ColorFormat = {
	mode: ObjectColorModes;
	channels: Channel[];
};

function isRecord(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function isNumberRecord(obj: unknown): obj is Record<string, number> {
	if (!isRecord(obj)) return false;
	return Object.values(obj).every(
		(v) => typeof v === 'number' && Number.isFinite(v), // This ensures we reject Infinity, -Infinity, and NaN
	);
}

function roundTo(value: number, decimals: number): number {
	const multiplier = 10 ** decimals;
	return Math.round(value * multiplier) / multiplier;
}

const COLOR_FORMATS: ColorFormat[] = [
	/* CMYK: TODO not supported by Culori
	 * https://github.com/Evercoder/culori/issues/121
	 * External int example: `{c: 50 (0-100%), m: 50 (0-100%), y: 20 (0-100%), k: 10 (0-100%), a: 50 (0-100%) }`
	 * External float example: `{c: 0.5, m: 0.5, y: 0.2, k: 0.1, a: 0.55 }`
	 * Internal example: TK
	 */
	// {
	// 	mode: 'cmyk',
	// 	channels: [
	// 		{
	// 			internalKey: 'c',
	// 			externalKeys: ['c', 'cyan'],
	// 			fromInt: (v) => v / 100,
	// 			toInt: (v) => Math.round(v * 100),
	// 		},
	// 		{
	// 			internalKey: 'm',
	// 			externalKeys: ['m', 'cyan'],
	// 			fromInt: (v) => v / 100,
	// 			toInt: (v) => Math.round(v * 100),
	// 		},
	// 		{
	// 			internalKey: 'y',
	// 			externalKeys: ['y', 'cyan'],
	// 			fromInt: (v) => v / 100,
	// 			toInt: (v) => Math.round(v * 100),
	// 		},
	// 		{
	// 			internalKey: 'k',
	// 			externalKeys: ['k', 'cyan'],
	// 			fromInt: (v) => v / 100,
	// 			toInt: (v) => Math.round(v * 100),
	// 		},
	// 		{
	// 			internalKey: 'alpha',
	// 			externalKeys: ['a', 'alpha'],
	// 			fromInt: (v) => v / 100,
	// 			toInt: (v) => Math.round(v * 100),
	// 		},
	// 	],
	// },
	/*
	 * [HSL](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
	 * External int example: `{h: 270 (0-360°), s: 100 (0-100%), l: 80 (0-100%), a: 25 (0-100%)}`
	 * External float example: `{h: .75, s: 1, l: .8, a: .25}`
	 * Internal example: `{h: 270 (0-360°), s: 1, l: 0.8, alpha: 0.25}`
	 */
	{
		mode: 'hsl',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
				fromFloat: (v) => v * 360,
				toFloat: (v) => v / 360,
			},
			{
				internalKey: 's',
				externalKeys: ['s', 'saturation'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
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
		mode: 'hsv',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
				fromFloat: (v) => v * 360,
				toFloat: (v) => v / 360,
			},
			{
				internalKey: 's',
				externalKeys: ['s', 'saturation'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'v',
				externalKeys: ['b', 'brightness', 'v', 'value'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
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
		mode: 'hwb',
		channels: [
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
				fromFloat: (v) => v * 360,
				toFloat: (v) => v / 360,
			},
			{
				internalKey: 'w',
				externalKeys: ['w', 'whiteness'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blackness'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
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
		mode: 'lab',
		channels: [
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
				fromFloat: (v) => v * 100,
				toFloat: (v) => v / 100,
			},
			{
				internalKey: 'a',
				externalKeys: ['a', 'green-red'],
				fromFloat: (v) => v * 250 - 125,
				toFloat: (v) => (v + 125) / 250,
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blue-yellow'],
				fromFloat: (v) => v * 250 - 125,
				toFloat: (v) => (v + 125) / 250,
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
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
		mode: 'lch',
		channels: [
			{
				internalKey: 'l',
				externalKeys: ['l', 'lightness'],
				fromFloat: (v) => v * 100,
				toFloat: (v) => v / 100,
			},
			{
				internalKey: 'c',
				externalKeys: ['c', 'chroma'],
				fromFloat: (v) => v * 150,
				toFloat: (v) => v / 150,
			},
			{
				internalKey: 'h',
				externalKeys: ['h', 'hue'],
				fromFloat: (v) => v * 360,
				toFloat: (v) => v / 360,
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 100,
				toInt: (v) => Math.round(v * 100),
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
		mode: 'rgb',
		channels: [
			{
				internalKey: 'r',
				externalKeys: ['r', 'red'],
				fromInt: (v) => v / 255,
				toInt: (v) => Math.round(v * 255),
			},
			{
				internalKey: 'g',
				externalKeys: ['g', 'green'],
				fromInt: (v) => v / 255,
				toInt: (v) => Math.round(v * 255),
			},
			{
				internalKey: 'b',
				externalKeys: ['b', 'blue'],
				fromInt: (v) => v / 255,
				toInt: (v) => Math.round(v * 255),
			},
			{
				internalKey: 'alpha',
				externalKeys: ['a', 'alpha'],
				fromInt: (v) => v / 255,
				toInt: (v) => Math.round(v * 255),
			},
		],
	},
];

/*
 * Convert an object to a Culori color object.
 * Infers the color mode based on the keys in the object.
 * Ignores capitalization, and treats abbrevations like `r` and `red` as equivalent.
 * If the object does not match any known color format, returns `undefined`.
 */
export function objectToInternalColor(
	obj: unknown,
	isFloat: boolean = false,
	forceAlpha: boolean = false,
): InternalColor | undefined {
	if (!isNumberRecord(obj)) return undefined;

	const value = Object.fromEntries(
		Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
	);

	const inputKeys = new Set(Object.keys(value).map((k) => k.toLowerCase()));

	for (const format of COLOR_FORMATS) {
		const {mode, channels} = format;

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
			const result: Record<string, string | number> = {
				mode,
			};

			// Process regular channels
			regularChannels.forEach((channel) => {
				const matchingKey = channel.externalKeys.find((key) =>
					inputKeys.has(key.toLowerCase()),
				);

				if (matchingKey) {
					let channelValue = value[matchingKey.toLowerCase()]!;

					if (isFloat && channel.fromFloat) {
						channelValue = channel.fromFloat(channelValue);
					} else if (!isFloat && channel.fromInt) {
						channelValue = channel.fromInt(channelValue);
					}
					result[channel.internalKey] = channelValue;
				}
			});

			// Handle alpha channel separately
			if (alphaChannel) {
				const alphaKey = alphaChannel.externalKeys.find((key) =>
					inputKeys.has(key.toLowerCase()),
				);

				if (alphaKey) {
					// Alpha value provided
					let alphaValue = value[alphaKey.toLowerCase()]!;
					if (isFloat && alphaChannel.fromFloat) {
						alphaValue = alphaChannel.fromFloat(alphaValue);
					} else if (!isFloat && alphaChannel.fromInt) {
						alphaValue = alphaChannel.fromInt(alphaValue);
					}
					result['alpha'] = alphaValue;
				} else if (forceAlpha) {
					// No alpha provided but forced
					result['alpha'] = 1;
				}
				// If no alpha provided and not forced, don't include alpha
			}

			return result as unknown as InternalColor;
		}
	}

	return undefined;
}

function modeForKeys(keys: string[]): ObjectColorModes | undefined {
	const lowerKeys = keys.map((key) => key.toLowerCase());

	for (const format of COLOR_FORMATS) {
		const {mode, channels} = format;

		const hasAllChannels =
			channels.every((channel) =>
				channel.externalKeys.some((key) =>
					lowerKeys.includes(key.toLowerCase()),
				),
			) &&
			lowerKeys.every((inputKey) =>
				channels.some((channel) =>
					channel.externalKeys.some((key) => key.toLowerCase() === inputKey),
				),
			);

		if (hasAllChannels) {
			return mode;
		}
	}

	return undefined;
}

export function internalColorToObject(
	color: InternalColor,
	/*
	 * Keys determine presence of alpha channel ...
	 */
	keys: string[],
	isFloat: boolean = false,
	precision: number | undefined = 3,
): Record<string, number> | undefined {
	// Infer the target color mode based on the keys in the destination object
	const targetMode = modeForKeys(keys);
	if (!targetMode) {
		return undefined;
	}

	// Convert the source color to the target implied by the object keys if needed
	const sourceColor =
		color.mode === targetMode ? {...color} : converter(color.mode)({...color});

	// Always have alpha, in case the destination object has an alpha key and the source does not
	sourceColor.alpha = sourceColor.alpha ?? 1;

	// Find the format configuration for the target mode
	const targetFormat = COLOR_FORMATS.find(
		(format) => format.mode === targetMode,
	);

	if (!targetFormat) {
		return undefined;
	}

	const colorObject: Record<string, number> = {};

	// Process each requested key
	for (const key of keys) {
		const lowerKey = key.toLowerCase();

		// Find the channel that matches this key
		const channel = targetFormat.channels.find((c) =>
			c.externalKeys.some((k) => k.toLowerCase() === lowerKey),
		);

		if (!channel) {
			return undefined;
		}

		const rawValue: number = sourceColor[
			channel.internalKey as keyof InternalColor
		] as number;

		let value: number;
		if (isFloat) {
			value = channel.toFloat ? channel.toFloat(rawValue) : rawValue;
		} else {
			value = channel.toInt ? channel.toInt(rawValue) : rawValue;
		}

		if (precision !== undefined) {
			value = roundTo(value, precision);
		}

		colorObject[key] = value;
	}

	return colorObject;
}
