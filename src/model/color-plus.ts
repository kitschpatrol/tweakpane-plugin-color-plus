import {constrainRange} from '@tweakpane/core';
import type {ColorConstructor as ColorObject, Coords, Ref} from 'colorjs.io';
import {
	ColorSpace,
	equals as colorJsEquals,
	get as colorJsGet,
	getAll as colorJsGetAll,
	HSV,
	LCH,
	P3,
	parse as colorJsParse,
	serialize as colorJsSerialize,
	set as colorJsSet,
	setAll as colorJsSetAll,
	sRGB,
	to as colorJsConvert,
} from 'colorjs.io/fn';

ColorSpace.register(sRGB);
ColorSpace.register(P3);
ColorSpace.register(HSV);
ColorSpace.register(LCH);

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

type AlphaMode =
	/* Strip the alpha channel, even if initially present */
	| 'never'
	/* Always include alpha channel, even if initially missing */
	| 'always'
	/* Include alpha channel if it's initially present */
	| 'auto';

export class ColorPlus {
	private alphaMode: AlphaMode;
	private parseMeta: ParseMeta;
	private color: ColorObject;
	private hasAlpha: boolean;

	private constructor(
		color: ColorObject,
		parseMeta: ParseMeta,
		alphaMode: AlphaMode,
		hasAlpha: boolean,
	) {
		this.color = color;
		this.parseMeta = parseMeta;
		this.alphaMode = alphaMode;
		this.hasAlpha = hasAlpha;
	}

	public static create(
		value: unknown,
		alphaMode: AlphaMode = 'auto',
	): ColorPlus | undefined {
		if (typeof value !== 'string') {
			console.warn('ColorPlus only supports string values for now');
			return undefined;
		}
		// TODO other types...
		try {
			const parseMetaInOut: Partial<ParseMeta> = {};
			const color = colorJsParse(value, {
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

			color.alpha = alphaMode === 'never' ? 1 : color.alpha;

			return new ColorPlus(color, parseMeta, alphaMode, hasAlpha);
		} catch (error) {
			console.warn(`Could not parse color string: ${String(error)}`);
			return undefined;
		}
	}

	/**
	 *
	 * @param formatId If undefined, uses the initial string format as the output format
	 * @returns
	 */
	public serialize(formatId?: string): string {
		// Bypass ColorPlus serialization persistence
		if (formatId !== undefined) {
			return colorJsSerialize(this.color, {format: formatId});
		}

		// See color.js/src/serialize.js
		const result = colorJsSerialize(this.color, {
			inGamut: true, // TODO expose? Overrides inGamut in the format object
			commas: this.parseMeta.commas,
			// precision: 4, // TODO expose?
			// @ts-expect-error - Type definition inconsistencies
			alpha:
				// Erase alpha from output
				this.alphaMode === 'never'
					? false
					: // Hex can't take object, so return boolean
						this.parseMeta.formatId === 'hex'
						? this.alphaMode === 'always' || this.hasAlpha
						: // Other formats need to know their original alpha format (e.g. <number> vs <percentage>)
							{
								include: this.alphaMode === 'always' || this.hasAlpha,
								type: this.parseMeta.alphaType,
							},
			// @ts-expect-error - Type definition inconsistencies
			coords: this.parseMeta.types,
			// @ts-expect-error - Type definition inconsistencies
			format: this.parseMeta.format,
		});

		if (this.parseMeta.formatId === 'hex') {
			return expandHex(result);
		} else {
			return result;
		}
	}

	public equals(other: ColorPlus): boolean {
		return colorJsEquals(this.color, other.color);
	}

	public set alpha(value: number) {
		this.set('alpha', constrainRange(value, 0, 1));
	}

	public get alpha(): number {
		return this.color.alpha ?? 1;
	}

	// TODO constrain space
	// TODO disallow 'none' values
	public getAll(space?: ColorSpaceId): number[] {
		return colorJsGetAll(this.color, {
			space,
		}) as number[];
	}

	public setAll(coords: Coords, space?: ColorSpaceId): void {
		colorJsSetAll(this.color, space ?? this.color.spaceId, coords);
	}

	public set(
		prop: Ref,
		value: number | ((coord: number) => number),
		space?: ColorSpaceId,
	): void {
		if (space !== undefined && space !== this.color.spaceId) {
			const converted = convert(this.color, space);
			colorJsSet(converted, prop, value);

			this.color = convert(converted, this.color.spaceId);
		} else {
			colorJsSet(this.color, prop, value);
		}
		if (prop === 'alpha') {
			this.color.alpha = constrainRange(this.color.alpha ?? 1, 0, 1);
		}
	}

	public clone(colorSpace?: ColorSpaceId): ColorPlus {
		const colorCopy = convert(this.color, colorSpace ?? this.color.spaceId);

		return new ColorPlus(
			colorCopy,
			this.parseMeta, // TODO structuredClone?
			this.alphaMode,
			this.hasAlpha,
		);
	}

	public get(prop: Ref, space?: ColorSpaceId): number {
		if (space !== undefined && space !== this.color.spaceId) {
			return colorJsGet(convert(this.color, space), prop);
		} else {
			return colorJsGet(this.color, prop);
		}
	}
}

// Wrapped because convert returns a ColorSpace object instead of a ColorSpaceId?
function convert(color: ColorObject, spaceId: ColorSpaceId): ColorObject {
	if (spaceId === color.spaceId) {
		return {
			coords: [...color.coords],
			alpha: color.alpha,
			spaceId: color.spaceId,
		};
	}

	const {coords, alpha} = colorJsConvert(color, spaceId);
	return {
		coords,
		alpha,
		spaceId: spaceId,
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
