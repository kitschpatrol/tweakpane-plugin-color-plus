import type { BaseInputParams, InputBindingPlugin, PickerLayout } from '@tweakpane/core'
import { createPlugin, writePrimitive } from '@tweakpane/core'
import type { PaletteProjection, PlaneLayout } from './model/channel.js'
import type { ColorFormat, GamutMethod } from './model/shared.js'
import type { ColorTupleRgb, ColorTupleRgba } from './model/tuple.js'
import type { ColorTextsMode } from './view/color-texts.js'
import type { GamutLines } from './view/plane-palette.js'
import { ColorController } from './controller/color.js'
import { ColorPlus } from './model/color-plus.js'
import { formatIsSerializable } from './model/shared.js'
import {
	clampColorToGamut,
	defaultsForFormat,
	normalizeGamuts,
	parseColorInputParams,
	textsModeForFormat,
	validateColorInputParams,
} from './utilities.js'

export type ColorPlusValue =
	| ColorTupleRgb
	| ColorTupleRgba
	| number
	| Record<string, null | number>
	| string
export type ColorPlusInputParams = BaseInputParams & {
	color?: {
		// In the original tweakpane installation, this is only applied to number values
		alpha?: boolean
		// When false, a typed value switches the binding's format to match
		// (experimental)
		formatLocked?: boolean
		// In the original tweakpane implementation, this only applied to object values
		type?: 'float' | 'int'
	}
	// Keep the color inside the widest configured gamut: plane picks snap to the
	// in-gamut frontier in the perceptual (un-stretched) plane, while slider
	// moves, typed text, and externally bound values shed chroma (at constant
	// lightness and hue) to fit; set false to allow out-of-gamut colors
	// (default true)
	constrain?: boolean
	expanded?: boolean
	// Draw the name of the narrowest configured gamut that holds the current
	// color in the picker plane's bottom-left corner (default true when the
	// bound color uses a wide or perceptual model, false when sRGB-bound)
	gamutLabel?: boolean
	// Which configured gamut boundaries are stroked over the picker plane:
	// 'inner' (default) draws the narrower gamuts' lines, 'outer' draws the
	// widest gamut's (otherwise redundant with the drawn plane's own edge),
	// 'all' draws both, 'none' hides every line
	gamutLines?: GamutLines
	// RGB gamut ids whose boundaries the OKLCH picker draws (default srgb and
	// p3 when the bound color uses a wide or perceptual model, just srgb when
	// it uses an sRGB-bound model like hex, rgb, or hsl)
	gamuts?: string[]
	// Channel-to-axis assignment for the picker plane and slider as
	// [X][Y]_[slider], e.g. 'CL_H' (default)
	paletteChannels?: PlaneLayout
	// How the picker plane projects the gamut volume onto its rectangle:
	// 'perceptual' keeps absolute OKLCH spacing (the gamut sits as an irregular
	// region), 'stretch' fills the plane with the widest gamut row by row, and
	// 'okhsv' (default) uses an OKHSV saturation/value projection on
	// lightness×chroma layouts (the vivid cusp lands in the corner), falling
	// back to 'stretch' behavior on the other layouts
	paletteProjection?: PaletteProjection
	picker?: PickerLayout
	// How the swatch's fallback triangle forces an out-of-gamut color into sRGB:
	// 'clip' clamps channels (matches what the browser paints on screen, the default),
	// 'css' applies the CSS Color 4 gamut-mapping algorithm (chroma reduction, which can
	// disagree with on-screen rendering — e.g. it renders full-lightness colors white).
	// Only affects the swatch preview, never the color value itself
	swatchFallback?: GamutMethod
	// Show the color model drop-down and per-channel text inputs below the
	// picker palette (default true)
	textFields?: boolean
}

type ColorPlusInputParamsInternal = ColorPlusInputParams & {
	constrain: boolean
	format: ColorFormat
	gamutLabel: boolean
	gamutLines: GamutLines
	gamuts: string[]
	lastExternalValue: ColorPlusValue
	// Misuse parameters to prevent rounding-related jitter on pane.refresh()
	lastInternalValue: ColorPlus
	paletteChannels: PlaneLayout
	paletteProjection: PaletteProjection
	swatchFallback: GamutMethod
	textFields: boolean
	textsMode: ColorTextsMode
}

// eslint-disable-next-line ts/naming-convention
export const ColorPlusInputPlugin: InputBindingPlugin<
	ColorPlus,
	ColorPlusValue,
	ColorPlusInputParamsInternal
> = createPlugin({
	// eslint-disable-next-line complexity -- option-assembly entry point; complexity grows by one branch per supported option default
	accept(value, params) {
		if (params.view !== 'color-plus') {
			return null
		}

		const parsedParams = parseColorInputParams(params)
		if (!parsedParams) {
			return null
		}

		const validParams = validateColorInputParams(params, value)

		const format = ColorPlus.getFormat(value, validParams.color?.alpha, parsedParams.color?.type)

		if (format === undefined) {
			console.warn('ColorPlusInputPlugin could not parse and get format')
			return null
		}

		if (!formatIsSerializable(format)) {
			console.warn('ColorPlusInputPlugin format not serializable')
			return null
		}

		const color = ColorPlus.create(value, validParams.color?.alpha, parsedParams.color?.type)
		if (color === undefined) {
			console.warn('ColorPlusInputPlugin could not parse')
			return null
		}

		// OKLCH is the internal working representation for the perceptual picker
		color.convert('oklch')

		const initialValue = color.toValue(format, validParams.color?.alpha)

		// Defaults that follow the gamut reach of the bound color's model
		const defaults = defaultsForFormat(format)

		return {
			initialValue,
			params: {
				// Set some defaults...
				color: {
					alpha: parsedParams.color?.alpha, // Typically undefined
					formatLocked: parsedParams.color?.formatLocked ?? true,
					type: parsedParams.color?.type ?? 'int',
				},
				constrain: parsedParams.constrain ?? true,
				expanded: parsedParams.expanded,
				format,
				gamutLabel: parsedParams.gamutLabel ?? defaults.gamutLabel,
				gamutLines: parsedParams.gamutLines ?? 'inner',
				gamuts: normalizeGamuts(parsedParams.gamuts, defaults.gamuts),
				// Internal
				lastExternalValue: initialValue,
				lastInternalValue: color,
				paletteChannels: parsedParams.paletteChannels ?? 'CL_H',
				paletteProjection: parsedParams.paletteProjection ?? 'okhsv',
				picker: parsedParams.picker,
				readonly: parsedParams.readonly,
				swatchFallback: parsedParams.swatchFallback ?? 'clip',
				textFields: parsedParams.textFields ?? true,
				textsMode: textsModeForFormat(format),
			},
		}
	},
	binding: {
		// Value equality (not identity): every internal write passes a fresh
		// clone, so comparing color values suppresses no-op updates — e.g.
		// re-typing the current value, or a refresh against an equal but
		// differently formatted external value, which identity comparison would
		// "normalize" by rewriting the user's bound value
		equals(a, b) {
			return a.equals(b)
		},
		// External to internal
		reader(args) {
			return (value: unknown) => {
				// Reuse the old internal value if the external representation is
				// unchanged... deals with having more precision internally than
				// externally
				if (deepEquals(value, args.params.lastExternalValue)) {
					return args.params.lastInternalValue
				}

				// Parse a new internal value from the external representation
				const newColor = ColorPlus.create(value, args.params.color?.alpha, args.params.color?.type)

				if (newColor === undefined) {
					console.warn('ColorPlusInputPlugin could not parse, using last value')
					return args.params.lastInternalValue
				}

				newColor.convert('oklch')

				if (args.params.constrain) {
					clampColorToGamut(newColor, args.params.gamuts)
				}

				return newColor
			}
		},
		// Internal to external
		writer(args) {
			return (target, inValue) => {
				args.params.lastInternalValue = inValue
				args.params.lastExternalValue = inValue.toValue(
					args.params.format,
					args.params.color?.alpha,
				)

				if (
					typeof args.params.lastExternalValue === 'number' ||
					typeof args.params.lastExternalValue === 'string'
				) {
					writePrimitive(target, args.params.lastExternalValue)
				} else if (Array.isArray(args.params.lastExternalValue)) {
					// Per-index writes mutate the bound array in place, like the object
					// branch, so external references to the array stay valid
					for (const [index, element] of args.params.lastExternalValue.entries()) {
						target.writeProperty(String(index), element)
					}
				} else {
					for (const key of Object.keys(args.params.lastExternalValue)) {
						target.writeProperty(key, args.params.lastExternalValue[key])
					}
				}
			}
		},
	},
	controller(args) {
		return new ColorController(args.document, {
			colorType: args.params.color?.type ?? 'int',
			constrain: args.params.constrain,
			expanded: args.params.expanded ?? false,
			formatter: (value: ColorPlus) =>
				value.serialize(args.params.format, args.params.color?.alpha),
			gamutLabel: args.params.gamutLabel,
			gamutLines: args.params.gamutLines,
			gamuts: args.params.gamuts,
			paletteChannels: args.params.paletteChannels,
			paletteProjection: args.params.paletteProjection,
			parser(text: string) {
				const parsedColor = ColorPlus.create(
					text,
					args.params.color?.alpha,
					args.params.color?.type,
				)
				if (parsedColor === undefined) {
					return null
				}

				if (args.params.color?.formatLocked === false) {
					const newFormat = ColorPlus.getFormat(
						text,
						// eslint-disable-next-line ts/no-unnecessary-condition
						args.params.color?.alpha,
						// eslint-disable-next-line ts/no-unnecessary-condition
						args.params.color?.type,
					)
					if (newFormat === undefined) {
						return null
					}

					args.params.format = newFormat
				}

				parsedColor.convert('oklch')

				if (args.params.constrain) {
					clampColorToGamut(parsedColor, args.params.gamuts)
				}

				// Discard alpha if it wasn't present originally
				if (!args.params.format.alpha && args.params.color?.alpha !== true) {
					parsedColor.alpha = 1
				}

				return parsedColor
			},
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: args.params.format.alpha || args.params.color?.alpha === true,
			swatchFallback: args.params.swatchFallback,
			textFields: args.params.textFields,
			textsMode: args.params.textsMode,
			value: args.value,
			viewProps: args.viewProps,
		})
	},
	id: 'input-color-plus',
	type: 'input',
})

// Optimized for shape of types we're going to see
function deepEquals(a: unknown, b: unknown): boolean {
	// Handle primitives and exact equality
	if (a === b) {
		return true
	}

	// Handle arrays
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((value, i) => value === b[i])
	}

	// Handle objects
	if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion, ts/no-unnecessary-type-assertion
		const keys = Object.keys(a as Record<string, unknown>)
		return (
			// eslint-disable-next-line ts/no-unsafe-type-assertion, ts/no-unnecessary-type-assertion
			keys.length === Object.keys(b as Record<string, unknown>).length &&
			keys.every(
				// eslint-disable-next-line ts/no-unsafe-type-assertion
				(key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key],
			)
		)
	}

	return false
}
