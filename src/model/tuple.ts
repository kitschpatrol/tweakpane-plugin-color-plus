import {
	ColorFormat,
	ColorPlusObject,
	ColorType,
	convert,
	formatNumber,
	TupleFormat,
} from './shared';

export type ColorTupleRgb = [number | null, number | null, number | null];
export type ColorTupleRgba = [
	number | null,
	number | null,
	number | null,
	number,
];

/**
 * @param value Accepts arrays / tuples or tuple-like strings, e.g. `'[1, 2, 3]'`
 * @param colorType
 * @returns
 */
export function tupleToColor(
	value: unknown,
	colorType: ColorType,
):
	| undefined
	| {
			color: ColorPlusObject;
			format: ColorFormat;
	  } {
	// Handle tuple-like strings, too
	const tupleValue =
		typeof value === 'string' ? (parseTupleString(value) ?? value) : value;

	if (!Array.isArray(tupleValue)) {
		return undefined;
	}

	// Ensure all values are numbers or null...
	if (
		!tupleValue.every(
			(v) => v === null || (typeof v === 'number' && Number.isFinite(v)),
		)
	) {
		console.warn('Invalid tuple values');
		return undefined;
	}

	if (!(tupleValue.length === 3 || tupleValue.length === 4)) {
		console.warn(`Invalid tuple length: ${tupleValue.length}`);
	}

	return {
		color: {
			spaceId: 'srgb',
			coords: [
				tupleValue[0] === null
					? null
					: colorType === 'int'
						? tupleValue[0] / 255
						: tupleValue[0],
				tupleValue[1] === null
					? null
					: colorType === 'int'
						? tupleValue[1] / 255
						: tupleValue[1],
				tupleValue[2] === null
					? null
					: colorType === 'int'
						? tupleValue[2] / 255
						: tupleValue[2],
			],
			alpha: tupleValue.length === 4 ? tupleValue[3] : 1,
		},
		format: {
			alpha: tupleValue.length === 4,
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
	const tuple = colorToTuple(color, format, alphaOverride);

	if (tuple === undefined) {
		return undefined;
	}

	const precision = (format.format as TupleFormat).colorType === 'int' ? 0 : 2;
	const precisionAlpha = 2;

	return stringifyTuple(tuple, precision, precisionAlpha);
}

function stringifyTuple(
	values: (number | null)[],
	precision: number,
	precisionAlpha: number,
): string {
	return `[${values
		.map((value, index) =>
			value === null
				? 'null'
				: formatNumber(value, index === 3 ? precisionAlpha : precision),
		)
		.join(', ')}]`;
}

function parseTupleString(value: string): unknown[] | undefined {
	try {
		const {valueKey} = JSON.parse(`{"valueKey": ${value}}`);
		return valueKey;
	} catch {
		return undefined;
	}
}
