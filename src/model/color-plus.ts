// import {constrainRange} from '@tweakpane/core';

import {constrainRange} from '@tweakpane/core';
import {
	get as colorJsGet,
	getAll as colorJsGetAll,
	type Ref,
	set as colorJsSet,
	setAll as colorJsSetAll,
	toGamutCSS as colorJsToGamutCss,
} from 'colorjs.io/fn';

import {ColorValueExternal} from '../plugin';
import {colorToNumber, colorToNumberString, numberToColor} from './number';
import {colorToObject, colorToObjectString, objectToColor} from './object';
import {
	ColorFormat,
	ColorPlusObject,
	ColorSpaceId,
	ColorType,
	convert,
	Coords,
	copyColorPlusObject,
	getColorPlusObjectFromColorJsObject,
	serialize,
	setFromColorPlusObject,
	toPrecision,
} from './shared';
import {colorToString, stringToColor} from './string';
import {colorToTuple, colorToTupleString, tupleToColor} from './tuple';

export class ColorPlus {
	private color: ColorPlusObject;

	private constructor(color: ColorPlusObject) {
		this.color = color;
	}

	public static getFormat(
		value: unknown,
		hasAlpha?: boolean,
		colorType?: ColorType,
	): ColorFormat | undefined {
		return parseColorAndFormat(value, hasAlpha, colorType)?.format;
	}

	public static create(
		value: unknown,
		hasAlpha?: boolean,
		colorType?: ColorType,
	): ColorPlus | undefined {
		// TODO faster path? TODO memoization?
		const parsed = parseColorAndFormat(value, hasAlpha, colorType);

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
		return `ColorPlus(${this.color.spaceId}, [${this.color.coords.map((c) => (c === null ? 'none' : toPrecision(c, 4)))}], ${this.color.alpha})`;
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
	): ColorValueExternal {
		switch (format.type) {
			case 'number':
				return colorToNumber(this.color, format, alphaOverride)!;
			case 'string':
				return colorToString(this.color, format, alphaOverride)!;
			case 'object':
				return colorToObject(this.color, format, alphaOverride)!;
			case 'tuple':
				return colorToTuple(this.color, format, alphaOverride)!;
		}
	}

	public serialize(format: ColorFormat, alphaOverride?: boolean): string {
		if (typeof format.format === 'string') {
			return serialize(this.color, format, alphaOverride)!;
		}

		switch (format.type) {
			case 'number':
				return colorToNumberString(this.color, format, alphaOverride)!;
			case 'string':
				return colorToString(this.color, format, alphaOverride)!;
			case 'object':
				return colorToObjectString(this.color, format, alphaOverride)!;
			case 'tuple':
				return colorToTupleString(this.color, format, alphaOverride)!;
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
		// TODO good idea to toPrecision here?
		return toPrecision(
			colorJsGet(
				convert(this.color, space ?? this.color.spaceId) ?? this.color,
				prop,
			),
			precision,
		);
	}

	public getAll(space?: ColorSpaceId, precision?: number): Coords {
		// TODO constrain space
		// TODO check for 'none' values?
		return colorJsGetAll(this.color, {
			space,
			precision,
		});

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
		coords: Coords,
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

	public get space(): ColorSpaceId {
		return this.color.spaceId;
	}

	public toGamut(space?: ColorSpaceId): void {
		const originalSpace = this.color.spaceId;
		const gamutSpace = space ?? originalSpace;

		this.color = getColorPlusObjectFromColorJsObject(
			colorJsToGamutCss(this.color, {space: gamutSpace}),
		);

		if (gamutSpace !== originalSpace) {
			this.convert(originalSpace);
		}
	}
}

function parseColorAndFormat(
	value: unknown,
	hasAlpha: boolean = false, // Numbers only
	colorType: ColorType = 'int', // Object and tuples only
): {color: ColorPlusObject; format: ColorFormat} | undefined {
	return (
		stringToColor(value) ??
		numberToColor(value, hasAlpha) ??
		objectToColor(value, colorType) ??
		tupleToColor(value, colorType)
	);
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
