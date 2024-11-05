import {
	ColorFormat,
	ColorPlusObject,
	ColorType,
	convert,
	TupleFormat,
} from './shared';

export type ColorTupleRgb = [number | null, number | null, number | null];
export type ColorTupleRgba = [
	number | null,
	number | null,
	number | null,
	number,
];

export function tupleToColor(
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

export function colorToTuple(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): undefined | ColorTupleRgb | ColorTupleRgba {
	if (format.type !== 'tuple') {
		console.warn(`Invalid format type: ${format.type}`);
		return undefined;
	}

	const {colorType} = format.format as TupleFormat;
	const convertedColor = convert(color, format.space) ?? color;

	const result = [
		convertedColor.coords[0] === null
			? null
			: convertedColor.coords[0] * (colorType === 'int' ? 255 : 1),
		convertedColor.coords[1] === null
			? null
			: convertedColor.coords[1] * (colorType === 'int' ? 255 : 1),
		convertedColor.coords[2] === null
			? null
			: convertedColor.coords[2] * (colorType === 'int' ? 255 : 1),
	];

	if (alphaOverride ?? format.alpha) {
		return [...result, convertedColor.alpha] as ColorTupleRgba;
	} else {
		return result as ColorTupleRgb;
	}
}

export function colorToTupleString(
	color: ColorPlusObject,
	format: ColorFormat,
	alphaOverride?: boolean,
): string | undefined {
	const value = colorToTuple(color, format, alphaOverride);
	return value === undefined ? undefined : value.toString();
}
