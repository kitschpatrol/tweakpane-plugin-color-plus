import {
	A98RGB,
	type ColorConstructor as ColorJsConstructor,
	ColorSpace as ColorJsColorSpace,
	HSL,
	HSV,
	HWB,
	Lab,
	Lab_D65,
	LCH,
	OKLab,
	OKLCH,
	P3,
	type PlainColorObject as PlainColorJsObject,
	ProPhoto,
	REC_2020,
	serialize as colorJsSerialize,
	sRGB,
	sRGB_Linear,
	to as colorJsConvert,
	XYZ_D50,
	XYZ_D65,
} from 'colorjs.io/fn';

// Loading color spaces that are either:
// - In the CSS 4 spec
// - Availe in CSS function() style colors
// - Used by Tweakpane's original implementation
ColorJsColorSpace.register(A98RGB); // a98-rgb
ColorJsColorSpace.register(HSL); // hsl(), hsla(), hsl,
ColorJsColorSpace.register(HSV); // --hsv (Tweakpane legacy)
ColorJsColorSpace.register(HWB); // hwb(), hwb
ColorJsColorSpace.register(Lab_D65); // lab-d65
ColorJsColorSpace.register(Lab); // lab(), lab, lab-d50
ColorJsColorSpace.register(LCH); // lch(), lch
ColorJsColorSpace.register(OKLab); // oklab(), oklab
ColorJsColorSpace.register(OKLCH); // oklch(), oklch
ColorJsColorSpace.register(P3); // display-p3
ColorJsColorSpace.register(ProPhoto); // prophoto-rgb
ColorJsColorSpace.register(REC_2020); // rec2020
ColorJsColorSpace.register(sRGB_Linear); // srgb-linear
ColorJsColorSpace.register(sRGB); // rgb(), rgba(), srgb
ColorJsColorSpace.register(XYZ_D50); // xyz-d50
ColorJsColorSpace.register(XYZ_D65); // xyz, xyz-d65

export type ColorType = 'int' | 'float';

// Subset of the full list to match what's supported / imported
export type ColorSpaceId =
	| 'a98-rgb'
	| 'display-p3'
	| 'hsl'
	| 'hsv'
	| 'hwb'
	| 'lab-d50'
	| 'lab-d65'
	| 'lab'
	| 'lch'
	| 'oklab'
	| 'oklch'
	| 'prophoto-rgb'
	| 'rec2020'
	| 'srgb-linear'
	| 'srgb'
	| 'xyz-d50'
	| 'xyz-d65'
	| 'xyz';

export type Coords = [number | null, number | null, number | null];

export type ColorPlusObject = {
	spaceId: ColorSpaceId;
	coords: Coords;
	alpha: number;
};

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
export type CoordFormat = {
	type: string;
	range: [number, number] | undefined;
	coordRange: [number, number] | undefined;
};

// Not yet correctly typed in colorjs.io
// This is a partial type based on inspection of the code
export type StringFormat = {
	alphaType?: string;
	commas?: boolean;
	types: string[];
	formatId: string;
	format: {
		type: string;
		name: string;
		alpha?: boolean | Record<string, unknown> | string;
		spaceCoords: undefined | number[];
		coords: (CoordFormat | CoordFormat[])[];
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
		spaceId: ('spaceId' in colorJs
			? colorJs.spaceId
			: colorJs.space.id) as ColorSpaceId,
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
 * Round a number to a certain number of significant digits after the decimal point
 * @param {number} n - The number to round
 * @param {number} decimalPrecision - Number of digits after the decimal point
 * @returns {number} The rounded number
 * @example
 * toDecimalPrecision(3.14159, 2) // returns 3.14
 * toDecimalPrecision(10.9999, 1) // returns 11.0
 * toDecimalPrecision(123.456, 0) // returns 123
 */
export function toDecimalPrecision(
	n: number,
	decimalPrecision: number | undefined,
): number {
	if (
		decimalPrecision === undefined ||
		decimalPrecision === null ||
		decimalPrecision < 0 ||
		!Number.isInteger(decimalPrecision) ||
		!Number.isFinite(n)
	) {
		return n;
	}

	if (decimalPrecision === 0) {
		return Math.round(n);
	}

	// Calculate the multiplier based on decimal precision
	const multiplier = Math.pow(10, decimalPrecision);

	// Round the number using the multiplier
	return Math.round(n * multiplier) / multiplier;
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

/**
 * Type check for string format object type
 */
export function isStringFormat(
	format: ColorFormat['format'],
): format is StringFormat {
	return (
		typeof format === 'object' &&
		format !== null &&
		'formatId' in format &&
		'format' in format &&
		typeof format.format === 'object' &&
		format.format !== null &&
		'type' in format.format &&
		typeof format.format.type === 'string'
	);
}

/**
 *  Some formats are parseable by Color.js but not serializable, e.g. keyword
 *  formats like `'blue'`. We can accept these after the format is initialized,
 *  but not as an initial color value.
 * @param format
 * @returns true if the format is serializable
 */
export function formatIsSerializable(format: ColorFormat): boolean {
	// Reimplement canSerialize() from colorjs
	if (isStringFormat(format.format)) {
		return (
			format.format.format.type === 'function' ||
			'serialize' in format.format.format
		);
	}
	// Assume all other formats are serializable
	return true;
}

export function applyDecimalPrecision(
	targetColor: ColorPlusObject,
	decimalPrecision: number,
	includeAlpha: boolean = true,
): void {
	targetColor.coords[0] =
		targetColor.coords[0] === null
			? null
			: toDecimalPrecision(targetColor.coords[0], decimalPrecision);
	targetColor.coords[1] =
		targetColor.coords[1] === null
			? null
			: toDecimalPrecision(targetColor.coords[1], decimalPrecision);
	targetColor.coords[2] =
		targetColor.coords[2] === null
			? null
			: toDecimalPrecision(targetColor.coords[2], decimalPrecision);
	if (includeAlpha) {
		targetColor.alpha = toDecimalPrecision(targetColor.alpha, decimalPrecision);
	}
}

export function colorPlusObjectsAreEqual(
	a: ColorPlusObject,
	b: ColorPlusObject,
): boolean {
	return (
		a.spaceId === b.spaceId &&
		a.alpha === b.alpha &&
		a.coords[0] === b.coords[0] &&
		a.coords[1] === b.coords[1] &&
		a.coords[2] === b.coords[2]
	);
}
