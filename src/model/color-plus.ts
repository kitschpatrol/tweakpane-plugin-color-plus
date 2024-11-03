// import {constrainRange} from '@tweakpane/core';

import {constrainRange} from '@tweakpane/core';
import {
	type ColorConstructor as ColorJsConstructor,
	ColorSpace as ColorJsColorSpace,
	type Coords,
	get as colorJsGet,
	getAll as colorJsGetAll,
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
	toGamut,
} from 'colorjs.io/fn';

ColorJsColorSpace.register(sRGB);
ColorJsColorSpace.register(P3);
ColorJsColorSpace.register(HSV);
ColorJsColorSpace.register(LCH);
ColorJsColorSpace.register(OKLCH);

type AlphaMode =
	/* Strip the alpha channel, even if initially present */
	| 'never'
	/* Always include alpha channel, even if initially missing */
	| 'always'
	/* Include alpha channel if it's initially present */
	| 'auto';

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
	format: ParseMeta | string; // Todo object types etc.
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

	public serialize(format: ColorFormat, alphaMode: AlphaMode = 'auto'): string {
		const convertedColor =
			convert(this.color, format.space ?? this.color.spaceId) ?? this.color;

		// Custom serialization...
		if (typeof format.format === 'string') {
			// TODO other types
			return colorJsSerialize(convertedColor, {format: format.format});
		}

		// See color.js/src/serialize.js
		const result = colorJsSerialize(convertedColor, {
			inGamut: true, // TODO expose? Overrides inGamut in the format object
			commas: format.format.commas,
			// precision: 4, // TODO expose?
			// @ts-expect-error - Type definition inconsistencies
			alpha:
				// Erase alpha from output
				alphaMode === 'never'
					? false
					: // Hex can't take object, so return boolean
						format.format.formatId === 'hex'
						? alphaMode === 'always' || format.alpha
						: // Other formats need to know their original alpha format (e.g. <number> vs <percentage>)
							{
								include: alphaMode === 'always' || format.alpha,
								type: format.format.alphaType,
							},
			// @ts-expect-error - Type definition inconsistencies
			coords: format.format.types,
			// @ts-expect-error - Type definition inconsistencies
			format: format.format.format,
		});

		if (format.format.formatId === 'hex') {
			return expandHex(result);
		} else {
			return result;
		}
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
		clip?: boolean,
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

			if (clip !== false) {
				toGamut(converted, {
					method: 'clip',
				});
			}

			setFromColorPlusObject(this.color, converted);
		}
	}

	public setAll(
		coords: [number, number, number],
		space?: ColorSpaceId,
		clip?: boolean,
	): void {
		// TODO constrain space
		// TODO room to optimize here? What does colorJsSet do to the class color object?
		const targetColor = copyColorPlusObject(this.color);
		colorJsSetAll(targetColor, space ?? this.color.spaceId, coords);

		if (clip !== false) {
			toGamut(targetColor, {
				method: 'clip',
			});
		}

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
	if (typeof value !== 'string') {
		console.warn('ColorPlus only supports string values for now');
		return undefined;
		// TODO other types...
	}

	try {
		const parseMetaInOut: Partial<ParseMeta> = {};
		const colorJs = colorJsParse(value, {
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
			(parseMeta.formatId === 'hex' && hexHasAlpha(value));

		if (!validateColorJsObject(colorJs)) {
			console.warn("Can't handle null coords");
			return undefined;
		}

		const color = getColorPlusObjectFromColorJsObject(colorJs);

		return {
			format: {format: parseMeta, alpha: hasAlpha, space: color.spaceId},
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
