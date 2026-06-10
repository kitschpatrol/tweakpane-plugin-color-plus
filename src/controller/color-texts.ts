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
import { ColorTextsView } from '../view/color-texts.js'

type Config = {
	colorType: ColorType
	supportsAlpha: boolean
	textsMode: ColorTextsMode
	value: Value<ColorPlus>
	viewProps: ViewProps
}

type ColorMode = 'hsl' | 'hsv' | 'okhsv' | 'oklch' | 'srgb'

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
		colorMode: ColorMode
		colorType: ColorType
		value: Value<ColorPlus>
		viewProps: ViewProps
	},
): ComponentControllerSet {
	const cc = {
		colorMode: config.colorMode,
		colorType: config.colorType,
		parser: parseNumber,
		viewProps: config.viewProps,
	}
	const disconnects: Array<() => void> = []
	const controllers = [0, 1, 2].map((i) => {
		const c = createComponentController(doc, cc, i)
		const disconnect = connectValues({
			// Number in text field to ColorPlus model
			backward(p, s) {
				const newColor = p.clone()
				const comps = newColor.getAll(config.colorMode)

				// eslint-disable-next-line ts/no-unnecessary-condition
				const typed = s ?? 0
				comps[i] = isOkMode(config.colorMode)
					? typed
					: config.colorType === 'float'
						? denormalizeCoord(config.colorMode, i, typed)
						: typed / (config.colorMode === 'srgb' ? 255 : 1)
				newColor.setAll(comps, config.colorMode)

				// Edge case to prevent wrapping 360 to 0 in HSL
				if (
					i === 0 &&
					config.colorMode === 'hsl' &&
					((config.colorType === 'int' && s === 360) || (config.colorType === 'float' && s === 1))
				) {
					newColor.set('h', 360)
				}

				return newColor
			},
			// ColorPlus model to number in text field
			forward(p) {
				let rawValue = p.getAll(config.colorMode)[i] ?? 0

				// Edge case to prevent wrapping 360 to 0 in HSL
				// eslint-disable-next-line ts/no-unnecessary-condition
				if (i === 0 && config.colorMode === 'hsl' && (p.get('h', 'hsv') ?? 0) === 360) {
					rawValue = 360
				}

				if (isOkMode(config.colorMode)) {
					return rawValue
				}

				return config.colorType === 'float'
					? (normalizeCoord(config.colorMode, i, rawValue) ?? 0)
					: rawValue * (config.colorMode === 'srgb' ? 255 : 1)
			},
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
		supportsAlpha: boolean
		value: Value<ColorPlus>
		viewProps: ViewProps
	},
) {
	const c = new TextController<ColorPlus>(doc, {
		// Text to color
		parser(text: string) {
			const parsedColor = ColorPlus.create(text)
			if (parsedColor === undefined) {
				return null
			}

			parsedColor.convert('oklch')

			// A typed hex only carries alpha when it has alpha digits (#rgba or
			// #rrggbbaa) and the binding supports alpha; otherwise keep the
			// color's current alpha rather than resetting it to opaque.
			const isAlphaInText = ColorPlus.getFormat(text)?.alpha ?? false
			if (!config.supportsAlpha || !isAlphaInText) {
				parsedColor.alpha = config.value.rawValue.alpha
			}

			return parsedColor
		},
		props: ValueMap.fromObject({
			formatter(value: ColorPlus): string {
				const serialized = value.serialize({
					alpha: config.supportsAlpha,
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
	private disconnectCcs: () => void
	private readonly supportsAlpha: boolean

	constructor(doc: Document, config: Config) {
		this.onModeSelectChange = this.onModeSelectChange.bind(this)

		this.colorType = config.colorType
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
				colorMode: mode,
				colorType: this.colorType,
				value: this.value,
				viewProps: this.viewProps,
			})
		}

		return createHexController(doc, {
			supportsAlpha: this.supportsAlpha,
			value: this.value,
			viewProps: this.viewProps,
		})
	}

	private onModeSelectChange(event_: Event) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		const selectElement = event_.currentTarget as HTMLSelectElement
		// eslint-disable-next-line ts/no-unsafe-type-assertion
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
