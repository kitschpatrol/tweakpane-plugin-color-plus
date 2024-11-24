// Import {constrainRange} from '@tweakpane/core';

import { constrainRange } from '@tweakpane/core'
import {
	get as colorJsGet,
	getAll as colorJsGetAll,
	set as colorJsSet,
	setAll as colorJsSetAll,
	toGamutCSS as colorJsToGamutCss,
	type Ref,
} from 'colorjs.io/fn'
import { type ColorValueExternal } from '../plugin'
import { colorToNumber, colorToNumberString, numberToColor } from './number'
import { colorToObject, colorToObjectString, objectToColor } from './object'
import {
	type ColorFormat,
	type ColorPlusObject,
	colorPlusObjectsAreEqual,
	type ColorSpaceId,
	type ColorType,
	convert,
	type Coords,
	copyColorPlusObject,
	getColorPlusObjectFromColorJsObject,
	serialize,
	setFromColorPlusObject,
	toDecimalPrecision,
} from './shared'
import { colorToString, stringToColor } from './string'
import { colorToTuple, colorToTupleString, tupleToColor } from './tuple'

export class ColorPlus {
	private constructor(private color: ColorPlusObject) {}

	public static create(
		value: unknown,
		hasAlpha?: boolean,
		colorType?: ColorType,
	): ColorPlus | undefined {
		// TODO faster path? TODO memoization?
		const parsed = parseColorAndFormat(value, hasAlpha, colorType)

		if (parsed === undefined) {
			console.warn('Could not parse color')
			return undefined
		}

		return new ColorPlus(parsed.color)
	}

	public static getFormat(
		value: unknown,
		hasAlpha?: boolean,
		colorType?: ColorType,
	): ColorFormat | undefined {
		return parseColorAndFormat(value, hasAlpha, colorType)?.format
	}

	public clone(): ColorPlus {
		return new ColorPlus(copyColorPlusObject(this.color))
	}

	public convert(spaceId: ColorSpaceId): void {
		this.color = convert(this.color, spaceId) ?? this.color
	}

	public equals(other: ColorPlus): boolean {
		return colorPlusObjectsAreEqual(this.color, other.color)
	}

	public get(prop: Ref, space?: ColorSpaceId): number {
		// TODO good idea to toDecimalPrecision here?
		return colorJsGet(convert(this.color, space ?? this.color.spaceId) ?? this.color, prop)
	}

	public getAll(space?: ColorSpaceId): Coords {
		// TODO constrain space
		// TODO check for 'none' values?

		// We handle conversion manually because of achromatic color rounding issues
		return colorJsGetAll(convert(this.color, space ?? this.color.spaceId) ?? this.color)

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

	public serialize(format: ColorFormat, alphaOverride?: boolean): string {
		// String format is used for internal one-offs
		if (typeof format.format === 'string') {
			return serialize(this.color, format, alphaOverride)!
		}

		switch (format.type) {
			case 'number': {
				return colorToNumberString(this.color, format, alphaOverride)!
			}

			case 'object': {
				return colorToObjectString(this.color, format, alphaOverride)!
			}

			case 'string': {
				return colorToString(this.color, format, alphaOverride)!
			}

			case 'tuple': {
				return colorToTupleString(this.color, format, alphaOverride)!
			}
		}
	}

	public set(
		prop: Ref,
		value: ((coord: number) => number) | number,
		space?: ColorSpaceId,
		// Clip?: boolean,
	): void {
		// Alpha always constrained to [0, 1]
		if (prop === 'alpha') {
			this.alpha = constrainRange(typeof value === 'number' ? value : value(this.alpha), 0, 1)
		} else {
			// TODO room to optimize here? What does colorJsSet do to the class color object?

			// Convert to target color space
			let converted =
				convert(this.color, space ?? this.color.spaceId) ?? copyColorPlusObject(this.color)
			colorJsSet(converted, prop, value)

			// Convert back to original color space
			converted = convert(converted, this.color.spaceId) ?? converted

			// If (clip !== false) {
			// 	toGamut(converted, {
			// 		method: 'css',
			// 	});
			// }

			setFromColorPlusObject(this.color, converted)
		}
	}

	public setAll(
		coords: Coords,
		space?: ColorSpaceId,
		// Clip?: boolean,
	): void {
		// TODO constrain space
		// TODO room to optimize here? What does colorJsSet do to the class color object?
		const targetColor = copyColorPlusObject(this.color)
		colorJsSetAll(targetColor, space ?? this.color.spaceId, coords)

		// If (clip !== false) {
		// 	toGamut(targetColor, {
		// 		method: 'css',
		// 	});
		// }

		setFromColorPlusObject(this.color, getColorPlusObjectFromColorJsObject(targetColor))
	}

	public toGamut(space?: ColorSpaceId): void {
		const originalSpace = this.color.spaceId
		const gamutSpace = space ?? originalSpace

		this.color = getColorPlusObjectFromColorJsObject(
			colorJsToGamutCss(this.color, { space: gamutSpace }),
		)

		if (gamutSpace !== originalSpace) {
			this.convert(originalSpace)
		}
	}

	public toJSON(): ColorPlusObject {
		return this.color
	}

	public toString(): string {
		return `ColorPlus(${this.color.spaceId}, [${this.color.coords.map((c) => (c === null ? 'none' : toDecimalPrecision(c, 4))).join(',')}], ${this.color.alpha})`
	}

	public toValue(format: ColorFormat, alphaOverride?: boolean): ColorValueExternal {
		switch (format.type) {
			case 'number': {
				return colorToNumber(this.color, format, alphaOverride)!
			}

			case 'object': {
				return colorToObject(this.color, format, alphaOverride)!
			}

			case 'string': {
				return colorToString(this.color, format, alphaOverride)!
			}

			case 'tuple': {
				return colorToTuple(this.color, format, alphaOverride)!
			}
		}
	}

	public get alpha(): number {
		return this.color.alpha
	}

	public set alpha(value: number) {
		this.color.alpha = constrainRange(value, 0, 1)
	}

	public get space(): ColorSpaceId {
		return this.color.spaceId
	}
}

function parseColorAndFormat(
	value: unknown,
	hasAlpha = false, // Numbers only
	colorType: ColorType = 'int', // Object and tuples only
): { color: ColorPlusObject; format: ColorFormat } | undefined {
	return (
		stringToColor(value) ??
		numberToColor(value, hasAlpha) ??
		objectToColor(value, colorType) ??
		tupleToColor(value, colorType)
	)
}
