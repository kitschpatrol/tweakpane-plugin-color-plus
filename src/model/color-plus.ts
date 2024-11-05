// import {constrainRange} from '@tweakpane/core';

import {constrainRange} from '@tweakpane/core';
import {
	type ColorConstructor as ColorJsConstructor,
	ColorSpace as ColorJsColorSpace,
	type Coords,
	get as colorJsGet,
	getAll as colorJsGetAll,
	HSL,
	HSV,
	LCH,
	OKLCH,
	P3,
	parse as colorJsParse,
	type PlainColorObject as PlainColorJsObject,
	type Ref,
	serialize as colorJsSerialize,
	set as colorJsSet,
	setAll as colorJsSetAll,
	sRGB,
	to as colorJsConvert,
	// toGamut,
} from 'colorjs.io/fn';

ColorJsColorSpace.register(sRGB);
ColorJsColorSpace.register(P3);
ColorJsColorSpace.register(HSV);
ColorJsColorSpace.register(HSL);
ColorJsColorSpace.register(LCH);
ColorJsColorSpace.register(OKLCH);

export type ColorType = 'int' | 'float';

// TODO Subset
export type ColorSpaceId =
	| 'a98rgb-linear'
	| 'a98rgb'
	| 'acescc'
	| 'acescg'
	| 'cam16'
	| 'hct'
	| 'hpluv'
	| 'hsl'
	| 'hsluv'
	| 'hsv'
	| 'hwb'
	| 'ictcp'
	| 'index-fn-hdr'
	| 'index-fn'
	| 'index'
	| 'jzazbz'
	| 'jzczhz'
	| 'lab-d65'
	| 'lab'
	| 'lch'
	| 'lchuv'
	| 'luv'
	| 'okhsl'
	| 'okhsv'
	| 'oklab'
	| 'oklch'
	| 'oklrab'
	| 'oklrch'
	| 'p3-linear'
	| 'p3'
	| 'prophoto-linear'
	| 'prophoto'
	| 'rec2020-linear'
	| 'rec2020'
	| 'rec2100-hlg'
	| 'rec2100-linear'
	| 'rec2100-pq'
	| 'srgb-linear'
	| 'srgb'
	| 'xyz-abs-d65'
	| 'xyz-d50'
	| 'xyz-d65'
	| string;

type ColorPlusObject = {
	spaceId: ColorSpaceId;
	coords: [number, number, number];
	alpha: number;
};

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
type ParseMeta = {
	alphaType?: string;
	commas?: boolean;
	types?: string[];
	formatId: string;
	format: {
		type: string;
		name: string;
		alpha?: boolean | Record<string, unknown> | string;
		spaceCoords: undefined | number[];
		coords: undefined | Coords;
		toGamut?: boolean;
		// test: [Function: test],
		// parse: [Function: parse],
		// serialize: [Function: serialize],
		// space: [RGBColorSpace],
		// [Symbol(instance)]: [Circular *1]
	};
};

/**
 * Original format and alpha state inferred from the user-provided value
 */
export type ColorFormat = {
	format: ParseMeta | string | 'number'; // Todo object types etc.
	alpha?: boolean;
	space?: ColorSpaceId;
};

export class ColorPlus {
	private color: ColorPlusObject;

	private constructor(color: ColorPlusObject) {
		this.color = color;
	}

	public static getFormat(value: unknown): ColorFormat | undefined {
		return parseColorAndFormat(value)?.format;
	}

	public static create(value: unknown): ColorPlus | undefined {
		const parsed = parseColorAndFormat(value);
		if (parsed === undefined) {
			console.warn('Could not parse color');
			return undefined;
		}
		return new ColorPlus(parsed.color);
	}

	public clone(): ColorPlus {
		return new ColorPlus(copyColorPlusObject(this.color));
	}

	public toString(): string {
		return `ColorPlus(${this.color.spaceId}, [${this.color.coords.map((c) => toPrecision(c, 4))}], ${this.color.alpha})`;
	}

	public toJSON(): ColorPlusObject {
		return this.color;
	}

	public convert(spaceId: ColorSpaceId): void {
		this.color = convert(this.color, spaceId) ?? this.color;
	}

	public toValue(
		format: ColorFormat,
		alphaOverride?: boolean,
	): number | string {
		const convertedColor =
			convert(this.color, format.space ?? this.color.spaceId) ?? this.color;

		// Special case for numbers
		if (format.format === 'number') {
			// Always SRGB
			const converted = convert(convertedColor, 'srgb') ?? convertedColor;

			const includeAlpha = alphaOverride ?? format.alpha;
			const [r, g, b] = converted.coords;

			// Convert from 0-1 range to 0-255 range and round to integers
			const ri = Math.round(r * 255);
			const gi = Math.round(g * 255);
			const bi = Math.round(b * 255);

			if (includeAlpha) {
				const a = Math.round(this.color.alpha * 255);
				return ((ri << 24) | (gi << 16) | (bi << 8) | a) >>> 0;
			} else {
				return ((ri << 16) | (gi << 8) | bi) >>> 0;
			}
		}

		// Generic color IDs
		if (typeof format.format === 'string') {
			// Must be string
			const result = colorJsSerialize(convertedColor, {
				format: format.format,
				alpha: alphaOverride ?? format.alpha,
			});

			// Special case for hex to avoid #0f0-style truncation
			return format.format === 'hex' ? expandHex(result) : result;
		}

		// Fancy format objects
		// See color.js/src/serialize.js
		const result = colorJsSerialize(convertedColor, {
			inGamut: true, // TODO expose? Overrides inGamut in the format object
			commas: format.format.commas,
			// precision: 4, // TODO expose?
			// @ts-expect-error - Type definition inconsistencies
			alpha:
				// Erase alpha from output
				alphaOverride === false
					? false
					: // Hex can't take object, so return boolean
						format.format.formatId === 'hex'
						? (alphaOverride ?? format.alpha)
						: // Other formats need to know their original alpha format (e.g. <number> vs <percentage>)
							{
								include: alphaOverride ?? format.alpha,
								type: format.format.alphaType,
							},
			// @ts-expect-error - Type definition inconsistencies
			coords: format.format.types,
			// @ts-expect-error - Type definition inconsistencies
			format: format.format.format,
		});

		// Special case for hex to avoid #0f0-style truncation
		if (format.format.formatId === 'hex') {
			return expandHex(result);
		} else {
			return result;
		}
	}

	public serialize(format: ColorFormat, alphaOverride?: boolean): string {
		const value = this.toValue(format, alphaOverride);

		if (typeof value === 'string') {
			return value;
		} else if (typeof value === 'number') {
			// Alpha already factored in toValue
			const includeAlpha = alphaOverride ?? format.alpha;
			return '0x' + value.toString(16).padStart(includeAlpha ? 8 : 6, '0');
		}

		throw new Error('Unexpected value type');
	}

	public equals(other: ColorPlus): boolean {
		return (
			this.color.spaceId === other.color.spaceId &&
			this.color.alpha === other.color.alpha &&
			this.color.coords.every((c, i) => c === other.color.coords[i])
		);
	}

	public set alpha(value: number) {
		this.color.alpha = constrainRange(value, 0, 1);
	}

	public get alpha(): number {
		return this.color.alpha;
	}

	public get(prop: Ref, space?: ColorSpaceId, precision?: number): number {
		return toPrecision(
			colorJsGet(
				convert(this.color, space ?? this.color.spaceId) ?? this.color,
				prop,
			),
			precision,
		);
	}

	public getAll(
		space?: ColorSpaceId,
		precision?: number,
	): [number, number, number] {
		// TODO constrain space
		// TODO check for 'none' values?
		return colorJsGetAll(this.color, {
			space,
			precision,
		}) as [number, number, number];

		// TODO copy check?
		// return colorJsGetAll(
		// 	space === undefined || space === this.color.spaceId
		// 		? this.color
		// 		: copyColorPlusObject(this.color),
		// 	{
		// 		space,
		// 	},
		// ) as [number, number, number];
	}

	public set(
		prop: Ref,
		value: number | ((coord: number) => number),
		space?: ColorSpaceId,
		// clip?: boolean,
	): void {
		// Alpha always constrained to [0, 1]
		if (prop === 'alpha') {
			this.alpha = constrainRange(
				typeof value === 'number' ? value : value(this.alpha),
				0,
				1,
			);
		} else {
			// TODO room to optimize here? What does colorJsSet do to the class color object?

			// Convert to target color space
			let converted =
				convert(this.color, space ?? this.color.spaceId) ??
				copyColorPlusObject(this.color);
			colorJsSet(converted, prop, value);

			// Convert back to original color space
			converted = convert(converted, this.color.spaceId) ?? converted;

			// if (clip !== false) {
			// 	toGamut(converted, {
			// 		method: 'css',
			// 	});
			// }

			setFromColorPlusObject(this.color, converted);
		}
	}

	public setAll(
		coords: [number, number, number],
		space?: ColorSpaceId,
		// clip?: boolean,
	): void {
		// TODO constrain space
		// TODO room to optimize here? What does colorJsSet do to the class color object?
		const targetColor = copyColorPlusObject(this.color);
		colorJsSetAll(targetColor, space ?? this.color.spaceId, coords);

		// if (clip !== false) {
		// 	toGamut(targetColor, {
		// 		method: 'css',
		// 	});
		// }

		setFromColorPlusObject(
			this.color,
			getColorPlusObjectFromColorJsObject(targetColor),
		);
	}
}

/** Returns a new color object only if conversion is needed, otherwise returns undefined */
function convert(
	color: ColorPlusObject,
	spaceId: ColorSpaceId,
): ColorPlusObject | undefined {
	if (color.spaceId === spaceId) {
		return undefined;
	}

	return getColorPlusObjectFromColorJsObject(colorJsConvert(color, spaceId));
}

function setFromColorPlusObject(
	targetColor: ColorPlusObject,
	sourceColor: ColorPlusObject,
): void {
	targetColor.spaceId = sourceColor.spaceId;
	targetColor.coords[0] = sourceColor.coords[0];
	targetColor.coords[1] = sourceColor.coords[1];
	targetColor.coords[2] = sourceColor.coords[2];
	targetColor.alpha = sourceColor.alpha;
}

function validateColorJsObject(
	colorJs: PlainColorJsObject | ColorJsConstructor,
): boolean {
	if (colorJs.coords.some((c) => c === null)) {
		return false;
	}
	return true;
}

/** Does not validate! */
function getColorPlusObjectFromColorJsObject(
	colorJs: PlainColorJsObject | ColorJsConstructor,
): ColorPlusObject {
	return {
		spaceId: 'spaceId' in colorJs ? colorJs.spaceId : colorJs.space.id,
		coords: [...(colorJs.coords as [number, number, number])],
		alpha: colorJs.alpha ?? 1,
	};
}

function copyColorPlusObject(color: ColorPlusObject): ColorPlusObject {
	return {
		spaceId: color.spaceId,
		coords: [...color.coords],
		alpha: color.alpha,
	};
}

function hexHasAlpha(hex: string): boolean {
	return hex.length === 5 || hex.length === 9;
}

function expandHex(hex: string): string {
	// Expects leading #
	const len = hex.length;
	if (len === 4 || len === 5) {
		let result = '#';
		for (let i = 1; i < len; i++) {
			result += hex[i] + hex[i];
		}
		return result;
	}
	return hex;
}

function parseColorAndFormat(
	value: unknown,
): undefined | {format: ColorFormat; color: ColorPlusObject} {
	const parsableString = toParsableColorString(value);
	if (parsableString === undefined) {
		console.warn('ColorPlus only supports string values for now');
		return undefined;
		// TODO other types...
	}

	const {colorString: valueString, colorFormat: valueFormat} = parsableString;

	try {
		const parseMetaInOut: Partial<ParseMeta> = {};
		const colorJs = colorJsParse(valueString, {
			// @ts-expect-error - Type definition inconsistencies
			parseMeta: parseMetaInOut,
		});

		// Is parseMetaInOut ever actually undefined?
		const parseMeta =
			parseMetaInOut.formatId === undefined
				? undefined
				: (parseMetaInOut as ParseMeta);

		if (parseMeta === undefined) {
			console.warn('Could not parse meta');
			return undefined;
		}

		if (
			parseMeta.format.alpha !== undefined &&
			typeof parseMeta.format.alpha !== 'boolean'
		) {
			console.warn('Alpha metadata is not boolean?');
			return undefined;
		}

		// console.log(parseMeta);
		const hasAlpha =
			parseMeta.format.alpha ||
			parseMeta.alphaType !== undefined ||
			(parseMeta.formatId === 'hex' && hexHasAlpha(valueString));

		if (!validateColorJsObject(colorJs)) {
			console.warn("Can't handle null coords");
			return undefined;
		}

		const color = getColorPlusObjectFromColorJsObject(colorJs);

		return {
			format: {
				format: valueFormat ?? parseMeta,
				alpha: hasAlpha,
				space: color.spaceId,
			},
			color: color,
		};
	} catch (error) {
		console.warn(`Could not parse color string: ${String(error)}`);
		return undefined;
	}
}

/**
 * From https://github.com/color-js/color.js/blob/b6984aa2e0d2c1b2f0863979d41b47df6f568894/src/util.js#L65
 * Round a number to a certain number of significant digits
 * @param {number} n - The number to round
 * @param {number} precision - Number of significant digits
 */
function toPrecision(n: number, precision: number | undefined): number {
	if (precision === undefined) {
		return n;
	}
	if (n === 0) {
		return 0;
	}
	const integer = ~~n;
	let digits = 0;
	if (integer && precision) {
		digits = ~~Math.log10(Math.abs(integer)) + 1;
	}
	const multiplier = 10.0 ** (precision - digits);
	return Math.floor(n * multiplier + 0.5) / multiplier;
}

// TODO needed?
// function colorJsApplyPrecision(
// 	targetColor: ColorPlusObject,
// 	precision: number | undefined,
// ): void {
// 	if (precision === undefined) {
// 		return;
// 	}
// 	targetColor.coords[0] = toPrecision(targetColor.coords[0], precision);
// 	targetColor.coords[1] = toPrecision(targetColor.coords[1], precision);
// 	targetColor.coords[2] = toPrecision(targetColor.coords[2], precision);
// }

function toParsableColorString(value: unknown):
	| {
			colorString: string;
			colorFormat: 'number' | undefined;
	  }
	| undefined {
	if (typeof value === 'string') {
		return {
			colorString: value.replace('0x', '#'),
			colorFormat: undefined,
		};
	}
	if (typeof value === 'number') {
		return {
			colorString: '#' + value.toString(16),
			colorFormat: 'number',
		};
	}

	//TODO objects and so forth
	return undefined;
}

function getColorJsColorSpaceById(
	spaceId: ColorSpaceId,
): ColorJsColorSpace | undefined {
	try {
		const space = ColorJsColorSpace.get(spaceId);
		return space;
	} catch {
		console.warn(`Unknown color space: ${spaceId}`);
		return undefined;
	}
}

export function getRangeForChannel(
	spaceId: ColorSpaceId,
	channelIndex: number,
): [number, number] {
	const space = getColorJsColorSpaceById(spaceId);
	if (space === undefined) {
		throw new Error(`Unknown color space: ${spaceId}`);
	}

	// Assumes correctly ordered channels...
	// Not sure how to get channel name to index map from color space
	const coordMeta = Object.values(space.coords).at(channelIndex);
	const range = coordMeta?.range ?? coordMeta?.refRange ?? undefined;

	if (range === undefined) {
		throw new Error(`Unknown range for channel: ${channelIndex}`);
	}

	return range;
}
