import type {
	Constraint,
	Formatter,
	InputView,
	Parser,
	Value,
	ValueController,
	ViewProps,
} from '@tweakpane/core'
import {
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	NumberTextController,
	parseNumber,
	TextController,
	ValueMap,
} from '@tweakpane/core'
import type { ColorType } from '../model/shared.js'
import type { ColorTextsMode } from '../view/color-texts.js'
import { ColorPlus } from '../model/color-plus.js'
import { CHROMA_CEILING } from '../model/gamut.js'
import { denormalizeCoord, getRangeForChannel, normalizeCoord } from '../model/shared.js'
import { connectValues } from '../model/value-sync.js'
import { clampColorToGamut } from '../utilities.js'
import { ColorTextsView } from '../view/color-texts.js'

type Config = {
	colorType: ColorType
	constrain: boolean
	gamuts: string[]
	supportsAlpha: boolean
	textsMode: ColorTextsMode
	value: Value<ColorPlus>
	viewProps: ViewProps
}

/** A texts drop-down mode with per-channel number fields (everything but hex). */
type ColorMode = 'hsl' | 'hsv' | 'okhsv' | 'oklch' | 'srgb'

/** How the per-channel number fields read and write the color. */
export type ChannelTextConfig = {
	colorMode: ColorMode
	colorType: ColorType
	// Pull typed values into the widest configured gamut, like the main text
	// field does (see the plugin's constrain option)
	constrain: boolean
	gamuts: string[]
}

/** What the hex field needs to turn typed text into a color. */
export type ColorTextConfig = {
	constrain: boolean
	gamuts: string[]
	supportsAlpha: boolean
}

/**
 * The OK modes show raw colorjs coordinates: the int/float `colorType` only
 * encodes sRGB-era conventions (0–255 vs 0–1) that don't apply to them.
 */
function isOkMode(mode: ColorMode): boolean {
	return mode === 'okhsv' || mode === 'oklch'
}

function isHueChannel(mode: ColorMode, index: number): boolean {
	return (mode === 'oklch' && index === 2) || (mode === 'okhsv' && index === 0)
}

/**
 * The number shown in channel `index`'s text field for the color: a raw colorjs
 * coordinate in the OK modes, otherwise scaled to the int (0–255 for sRGB) or
 * float (0–1) convention.
 */
export function channelValue(color: ColorPlus, config: ChannelTextConfig, index: number): number {
	const { colorMode, colorType } = config
	let rawValue = color.getAll(colorMode)[index] ?? 0

	// Edge case to prevent wrapping 360 to 0 in HSL
	// eslint-disable-next-line ts/no-unnecessary-condition
	if (index === 0 && colorMode === 'hsl' && (color.get('h', 'hsv') ?? 0) === 360) {
		rawValue = 360
	}

	if (isOkMode(colorMode)) {
		return rawValue
	}

	return colorType === 'float'
		? (normalizeCoord(colorMode, index, rawValue) ?? 0)
		: rawValue * (colorMode === 'srgb' ? 255 : 1)
}

/**
 * A copy of the color with channel `index` set from its text field's number,
 * the inverse of `channelValue`. With constraining on, the result is pulled
 * into the widest configured gamut, so a typed channel can't push the color out
 * of gamut any more than the main text field can.
 */
export function withChannelValue(
	color: ColorPlus,
	config: ChannelTextConfig,
	index: number,
	value: number,
): ColorPlus {
	const { colorMode, colorType } = config
	const next = color.clone()
	const comps = next.getAll(colorMode)
	comps[index] = isOkMode(colorMode)
		? value
		: colorType === 'float'
			? denormalizeCoord(colorMode, index, value)
			: value / (colorMode === 'srgb' ? 255 : 1)
	next.setAll(comps, colorMode)

	// Edge case to prevent wrapping 360 to 0 in HSL
	if (
		index === 0 &&
		colorMode === 'hsl' &&
		((value === 360 && colorType === 'int') || (value === 1 && colorType === 'float'))
	) {
		next.set('h', 360)
	}

	if (config.constrain) {
		clampColorToGamut(next, config.gamuts)
	}

	return next
}

/**
 * Parse the hex field's text (any color string the plugin understands) into the
 * working OKLCH representation, constrained into the widest configured gamut
 * when asked. Typed text only carries alpha when it spells one out
 * (`#rrggbbaa`, `rgb(… / 0.5)`) and the binding supports alpha; otherwise the
 * color's current alpha is kept rather than reset to opaque.
 *
 * @returns Null when the text isn't a color.
 */
export function parseColorText(
	text: string,
	config: ColorTextConfig,
	currentAlpha: number,
): ColorPlus | null {
	const parsedColor = ColorPlus.create(text)
	if (parsedColor === undefined) {
		return null
	}

	parsedColor.convert('oklch')

	if (config.constrain) {
		clampColorToGamut(parsedColor, config.gamuts)
	}

	const isAlphaInText = ColorPlus.getFormat(text)?.alpha ?? false
	if (!isAlphaInText || !config.supportsAlpha) {
		parsedColor.alpha = currentAlpha
	}

	return parsedColor
}

function createFormatter(mode: ColorMode, type: ColorType, index: number): Formatter<number> {
	if (isOkMode(mode)) {
		return createNumberFormatter(isHueChannel(mode, index) ? 1 : 3)
	}

	return createNumberFormatter(type === 'float' ? 3 : 0)
}

function channelScale(mode: ColorMode, type: ColorType, index: number): number {
	if (isOkMode(mode)) {
		return isHueChannel(mode, index) ? 1 : 0.01
	}

	return type === 'float' ? 0.01 : 1
}

function createConstraint(mode: ColorMode, type: ColorType, index: number): Constraint<number> {
	if (isOkMode(mode)) {
		// Colorjs's OKLCH chroma reference range tops out at 0.4, below real
		// wide-gamut chroma, so use the picker's ceiling instead
		if (mode === 'oklch' && index === 1) {
			return new DefiniteRangeConstraint({ min: 0, max: CHROMA_CEILING })
		}

		const [min, max] = getRangeForChannel(mode, index)
		return new DefiniteRangeConstraint({ min, max })
	}

	if (type === 'float') {
		return new DefiniteRangeConstraint({ min: 0, max: 1 })
	}

	const [min, max] = getRangeForChannel(mode, index)

	// eslint-disable-next-line ts/no-unnecessary-condition
	const coefficient = type === 'int' && mode === 'srgb' ? 255 : 1

	return new DefiniteRangeConstraint({
		min: min * coefficient,
		max: max * coefficient,
	})
}

function createComponentController(
	doc: Document,
	config: {
		colorMode: ColorMode
		colorType: ColorType
		parser: Parser<number>
		viewProps: ViewProps
	},
	index: number,
): NumberTextController {
	const scale = channelScale(config.colorMode, config.colorType, index)
	return new NumberTextController(doc, {
		arrayPosition: index === 0 ? 'fst' : index === 3 - 1 ? 'lst' : 'mid',
		parser: config.parser,
		props: ValueMap.fromObject({
			formatter: createFormatter(config.colorMode, config.colorType, index),
			keyScale: scale,
			pointerScale: scale,
		}),
		value: createValue(0, {
			constraint: createConstraint(config.colorMode, config.colorType, index),
		}),
		viewProps: config.viewProps,
	})
}

function createComponentControllers(
	doc: Document,
	config: {
		channel: ChannelTextConfig
		value: Value<ColorPlus>
		viewProps: ViewProps
	},
): ComponentControllerSet {
	const cc = {
		colorMode: config.channel.colorMode,
		colorType: config.channel.colorType,
		parser: parseNumber,
		viewProps: config.viewProps,
	}
	const disconnects: Array<() => void> = []
	const controllers = [0, 1, 2].map((i) => {
		const c = createComponentController(doc, cc, i)
		const disconnect = connectValues({
			// Number in text field to ColorPlus model
			backward: (p, s) => withChannelValue(p, config.channel, i, s),
			// ColorPlus model to number in text field
			forward: (p) => channelValue(p, config.channel, i),
			primary: config.value,
			// Like the 'view'
			secondary: c.value,
		})
		disconnects.push(disconnect)
		return c
	})
	return {
		controllers,
		disconnect() {
			for (const disconnect of disconnects) {
				disconnect()
			}
		},
	}
}

function createHexController(
	doc: Document,
	config: {
		text: ColorTextConfig
		value: Value<ColorPlus>
		viewProps: ViewProps
	},
) {
	const c = new TextController<ColorPlus>(doc, {
		// Text to color
		parser: (text: string) => parseColorText(text, config.text, config.value.rawValue.alpha),
		props: ValueMap.fromObject({
			formatter(value: ColorPlus): string {
				const serialized = value.serialize({
					alpha: config.text.supportsAlpha,
					format: 'hex',
					space: 'srgb',
					type: 'string',
				})
				return serialized
			},
		}),
		value: createValue(config.value.rawValue.clone()),
		viewProps: config.viewProps,
	})

	const disconnect = connectValues({
		backward(_, s) {
			return s
		},
		forward(p) {
			return p.clone()
		},
		primary: config.value,
		secondary: c.value,
	})

	return {
		controllers: [c] as ComponentValueController[],
		disconnect,
	}
}

function isColorMode(mode: ColorTextsMode): mode is ColorMode {
	return mode !== 'hex'
}

type ComponentValueController = ValueController<unknown, InputView>

type ComponentControllerSet = {
	controllers: ComponentValueController[]
	disconnect: () => void
}

export class ColorTextsController implements ValueController<ColorPlus, ColorTextsView> {
	public readonly colorMode: Value<ColorTextsMode>
	public readonly value: Value<ColorPlus>
	public readonly view: ColorTextsView
	public readonly viewProps: ViewProps
	private ccs: ComponentValueController[]
	private readonly colorType: ColorType
	private readonly constrain: boolean
	private disconnectCcs: () => void
	private readonly gamuts: string[]
	private readonly supportsAlpha: boolean

	constructor(doc: Document, config: Config) {
		this.onModeSelectChange = this.onModeSelectChange.bind(this)

		this.colorType = config.colorType
		this.constrain = config.constrain
		this.gamuts = config.gamuts
		this.supportsAlpha = config.supportsAlpha
		this.value = config.value
		this.viewProps = config.viewProps

		this.colorMode = createValue<ColorTextsMode>(config.textsMode)
		const { controllers, disconnect } = this.createComponentControllers(doc)
		this.ccs = controllers
		this.disconnectCcs = disconnect

		this.view = new ColorTextsView(doc, {
			inputViews: this.ccs.map((cc) => cc.view),
			mode: this.colorMode,
			viewProps: this.viewProps,
		})

		this.view.modeSelectElement.addEventListener('change', this.onModeSelectChange)

		config.viewProps.handleDispose(() => {
			this.disconnectCcs()
		})
	}

	private createComponentControllers(doc: Document): ComponentControllerSet {
		const mode = this.colorMode.rawValue
		if (isColorMode(mode)) {
			return createComponentControllers(doc, {
				channel: {
					colorMode: mode,
					colorType: this.colorType,
					constrain: this.constrain,
					gamuts: this.gamuts,
				},
				value: this.value,
				viewProps: this.viewProps,
			})
		}

		return createHexController(doc, {
			text: {
				constrain: this.constrain,
				gamuts: this.gamuts,
				supportsAlpha: this.supportsAlpha,
			},
			value: this.value,
			viewProps: this.viewProps,
		})
	}

	private onModeSelectChange(event_: Event) {
		const selectElement = event_.currentTarget as HTMLSelectElement

		this.colorMode.rawValue = selectElement.value as ColorMode

		// Unhook the previous mode's controllers from the shared color value so
		// their change handlers don't accumulate across mode switches
		this.disconnectCcs()
		const { controllers, disconnect } = this.createComponentControllers(
			this.view.element.ownerDocument,
		)
		this.ccs = controllers
		this.disconnectCcs = disconnect
		this.view.inputViews = this.ccs.map((cc) => cc.view)
	}
}
