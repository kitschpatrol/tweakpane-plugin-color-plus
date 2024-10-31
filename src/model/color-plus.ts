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
		// This provides no additional safety?
		// colorJsSet(this.color, 'alpha', constrainRange(value, 0, 1));
		this.color.alpha = constrainRange(value, 0, 1);
	}

	public get alpha(): number {
		return this.color.alpha;
	}

	public get(prop: Ref, space?: ColorSpaceId): number {
		return colorJsGet(
			convert(this.color, space ?? this.color.spaceId) ?? this.color,
			prop,
		);
	}

	public getAll(space?: ColorSpaceId): [number, number, number] {
		// TODO constrain space
		// TODO check for 'none' values?
		return colorJsGetAll(this.color, {
			space,
		}) as [number, number, number];
	}

	public set(
		prop: Ref,
		value: number | ((coord: number) => number),
		space?: ColorSpaceId,
	): void {
		// TODO constrain space?
		if (prop === 'alpha') {
			this.alpha = typeof value === 'number' ? value : value(this.alpha);
		} else {
			// TODO room to optimize here? What does colorJsSet do to the class color object?
			const converted =
				convert(this.color, space ?? this.color.spaceId) ??
				copyColorPlusObject(this.color);
			colorJsSet(converted, prop, value);
			setFromColorPlusObject(
				this.color,
				getColorPlusObjectFromColorJsObject(converted),
			);
		}
	}

	public setAll(coords: [number, number, number], space?: ColorSpaceId): void {
		// TODO constrain space
		// TODO room to optimize here? What does colorJsSet do to the class color object?
		const targetColor = copyColorPlusObject(this.color);
		colorJsSetAll(targetColor, space ?? this.color.spaceId, coords);
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
