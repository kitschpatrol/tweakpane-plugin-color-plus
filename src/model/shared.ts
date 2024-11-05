import {
	type ColorConstructor as ColorJsConstructor,
	ColorSpace as ColorJsColorSpace,
	HSL,
	HSV,
	HWB,
	Lab,
	LCH,
	OKLCH,
	P3,
	type PlainColorObject as PlainColorJsObject,
	serialize as colorJsSerialize,
	sRGB,
	to as colorJsConvert,
} from 'colorjs.io/fn';

ColorJsColorSpace.register(sRGB);
ColorJsColorSpace.register(P3);
ColorJsColorSpace.register(HSV);
ColorJsColorSpace.register(HSV);
ColorJsColorSpace.register(HSL);
ColorJsColorSpace.register(LCH);
ColorJsColorSpace.register(Lab);
ColorJsColorSpace.register(OKLCH);
ColorJsColorSpace.register(HWB);

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

export type Coords = [number | null, number | null, number | null];

export type ColorPlusObject = {
	spaceId: ColorSpaceId;
	coords: Coords;
	alpha: number;
};

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
export type StringFormat = {
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

export type ObjectFormat = {
	colorType: ColorType;
	coordKeys: [string, string, string];
	alphaKey: string | undefined; // undefined if no alpha
};

// TODO internal
export type TupleFormat = {
	// Space is always SRGB
	colorType: ColorType;
};

/**
 * Original format and alpha state inferred from the user-provided value
 */
export type ColorFormat = {
	type: 'number' | 'string' | 'object' | 'tuple';
	format: StringFormat | ObjectFormat | TupleFormat | string;
	alpha: boolean;
	space: ColorSpaceId;
};

/** Returns a new color object only if conversion is needed, otherwise returns undefined */
export function convert(
	color: ColorPlusObject,
	spaceId: ColorSpaceId,
): ColorPlusObject | undefined {
	if (color.spaceId === spaceId) {
		return undefined;
	}

	return getColorPlusObjectFromColorJsObject(colorJsConvert(color, spaceId));
}

export function setFromColorPlusObject(
	targetColor: ColorPlusObject,
	sourceColor: ColorPlusObject,
): void {
	targetColor.spaceId = sourceColor.spaceId;
	targetColor.coords[0] = sourceColor.coords[0];
	targetColor.coords[1] = sourceColor.coords[1];
	targetColor.coords[2] = sourceColor.coords[2];
	targetColor.alpha = sourceColor.alpha;
}

// export function validateColorJsObject(
// 	colorJs: PlainColorJsObject | ColorJsConstructor,
// ): boolean {
// 	if (colorJs.coords.some((c) => c === null)) {
// 		return false;
// 	}
// 	return true;
// }

/** Does not validate! */
export function getColorPlusObjectFromColorJsObject(
	colorJs: PlainColorJsObject | ColorJsConstructor,
): ColorPlusObject {
	return {
		spaceId: 'spaceId' in colorJs ? colorJs.spaceId : colorJs.space.id,
		coords: [...(colorJs.coords as [number, number, number])],
		alpha: colorJs.alpha ?? 1,
	};
}

export function copyColorPlusObject(color: ColorPlusObject): ColorPlusObject {
	return {
		spaceId: color.spaceId,
		coords: [...color.coords],
		alpha: color.alpha,
	};
}

export function hexHasAlpha(hex: string): boolean {
	return hex.length === 5 || hex.length === 9;
}

export function expandHex(hex: string): string {
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

// Generic serialization...
export function serialize(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	if (typeof format.format !== 'string') {
		console.warn('Invalid format type');
		return undefined;
	}

	const convertedColor = convert(color, format.space) ?? color;

	const result = colorJsSerialize(convertedColor, {
		format: format.format,
		alpha: alphaOverride ?? format.alpha,
	});

	// Special case for hex to avoid #0f0-style truncation
	return format.format === 'hex' ? expandHex(result) : result;
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

/**
 * From https://github.com/color-js/color.js/blob/b6984aa2e0d2c1b2f0863979d41b47df6f568894/src/util.js#L65
 * Round a number to a certain number of significant digits
 * @param {number} n - The number to round
 * @param {number} precision - Number of significant digits
 */
export function toPrecision(n: number, precision: number | undefined): number {
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

export function formatNumber(
	value: number,
	digits: number | undefined,
): string {
	if (digits === undefined) {
		return value.toString();
	}
	return value.toFixed(Math.max(Math.min(digits, 20), 0));
}
