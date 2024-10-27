import type {ColorConstructor as ColorObject, Coords} from 'colorjs.io';
import {
	ColorSpace,
	LCH,
	P3,
	parse,
	serialize,
	sRGB,
	// to as convert,
	// toGamut,
} from 'colorjs.io/fn';

ColorSpace.register(sRGB);
ColorSpace.register(P3);
ColorSpace.register(LCH);

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
			const color = parse(value, {
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

	public serialize(): string {
		// See color.js/src/serialize.js
		const result = serialize(this.color, {
			inGamut: true, // TODO expose? Overrides inGamut in the format object
			commas: this.parseMeta.commas,
			precision: 4, // TODO expose?
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
