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
	connectValues,
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	NumberTextController,
	parseNumber,
	TextController,
	ValueMap,
} from '@tweakpane/core'
import type { ColorType } from '../model/shared.js'
import { ColorPlus } from '../model/color-plus.js'
import { denormalizeCoord, getRangeForChannel, normalizeCoord } from '../model/shared.js'
// Import {getKeyScaleForColor} from '../util.js';
import type { ColorTextsMode } from '../view/color-texts.js'
import { ColorTextsView } from '../view/color-texts.js'

type Config = {
	colorType: ColorType
	value: Value<ColorPlus>
	viewProps: ViewProps
}

function createFormatter(type: ColorType): Formatter<number> {
	return createNumberFormatter(type === 'float' ? 3 : 0)
}

type ColorMode = 'hsl' | 'hsv' | 'srgb'

function createConstraint(mode: ColorMode, type: ColorType, index: number): Constraint<number> {
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
	return new NumberTextController(doc, {
		arrayPosition: index === 0 ? 'fst' : index === 3 - 1 ? 'lst' : 'mid',
		parser: config.parser,
		props: ValueMap.fromObject({
			formatter: createFormatter(config.colorType),
			keyScale: config.colorType === 'float' ? 0.01 : 1, // TODO revisit was getKeyScaleForColor(false)
			pointerScale: config.colorType === 'float' ? 0.01 : 1,
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
): NumberTextController[] {
	const cc = {
		colorMode: config.colorMode,
		colorType: config.colorType,
		parser: parseNumber,
		viewProps: config.viewProps,
	}
	return [0, 1, 2].map((i) => {
		const c = createComponentController(doc, cc, i)
		connectValues({
			// Number in text field to ColorPlus model
			backward(p, s) {
				// Number / channel to ColorPlus object
				// Note edge case for int srgb representation
				// TODO setChannel method on ColorPlus?
				const newColor = p.clone()
				const comps = newColor.getAll(config.colorMode)

				comps[i] =
					config.colorType === 'float'
						? // eslint-disable-next-line ts/no-unnecessary-condition
							denormalizeCoord(config.colorMode, i, s ?? 0)
						: // eslint-disable-next-line ts/no-unnecessary-condition
							(s ?? 0) / (config.colorMode === 'srgb' ? 255 : 1)
				newColor.setAll(comps, config.colorMode)

				// Edge case to prevent wrapping 360 to 0 in HSL
				if (
					i === 0 &&
					config.colorMode === 'hsl' &&
					((config.colorType === 'int' && s === 360) || (config.colorType === 'float' && s === 1))
				) {
					console.log('edge')
					newColor.set('h', 360)
				}

				return newColor
			},
			// From HSV ColorPlus model to number in text field
			// Note edge case for int srgb representation
			forward(p) {
				let rawValue = p.getAll(config.colorMode)[i] ?? 0

				// TODO revisit
				// Edge case to prevent wrapping 360 to 0 in HSL
				// eslint-disable-next-line ts/no-unnecessary-condition
				if (i === 0 && config.colorMode === 'hsl' && (p.get('h', 'hsv') ?? 0) === 360) {
					rawValue = 360
				}

				return config.colorType === 'float'
					? (normalizeCoord(config.colorMode, i, rawValue) ?? 0)
					: rawValue * (config.colorMode === 'srgb' ? 255 : 1)
			},
			primary: config.value,
			// Like the 'view'
			secondary: c.value,
		})
		return c
	})
}

function createHexController(
	doc: Document,
	config: {
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

			parsedColor.convert('hsv')
			// ParsedColor.toGamut('srgb');
			parsedColor.alpha = config.value.rawValue.alpha

			return parsedColor
		},
		props: ValueMap.fromObject({
			formatter(value: ColorPlus): string {
				const serialized = value.serialize({
					alpha: false,
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

	connectValues({
		// TODO hmm, s
		backward(_, s) {
			return s
		},
		// TODO hmm
		forward(p) {
			return p.clone()
		},
		primary: config.value,
		secondary: c.value,
	})

	return [c] as ComponentValueController[]
}

function isColorMode(mode: ColorTextsMode): mode is ColorMode {
	return mode !== 'hex'
}

type ComponentValueController = ValueController<unknown, InputView>

export class ColorTextsController implements ValueController<ColorPlus, ColorTextsView> {
	public readonly colorMode: Value<ColorTextsMode>
	public readonly value: Value<ColorPlus>
	public readonly view: ColorTextsView
	public readonly viewProps: ViewProps
	private ccs: ComponentValueController[]
	private readonly colorType: ColorType

	constructor(doc: Document, config: Config) {
		this.onModeSelectChange = this.onModeSelectChange.bind(this)

		this.colorType = config.colorType
		this.value = config.value
		this.viewProps = config.viewProps

		// HMM, initial color setting?
		// this.colorMode = createValue(this.value.rawValue.mode as ColorTextsMode);
		this.colorMode = createValue('srgb')
		this.ccs = this.createComponentControllers(doc)

		this.view = new ColorTextsView(doc, {
			inputViews: [this.ccs[0].view, this.ccs[1].view, this.ccs[2].view],
			mode: this.colorMode,
			viewProps: this.viewProps,
		})

		this.view.modeSelectElement.addEventListener('change', this.onModeSelectChange)
	}

	private createComponentControllers(doc: Document): ComponentValueController[] {
		const mode = this.colorMode.rawValue
		if (isColorMode(mode)) {
			return createComponentControllers(doc, {
				colorMode: mode,
				colorType: this.colorType,
				value: this.value,
				viewProps: this.viewProps,
			}) as ComponentValueController[]
		}

		return createHexController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		})
	}

	private onModeSelectChange(event_: Event) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		const selectElement = event_.currentTarget as HTMLSelectElement
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		this.colorMode.rawValue = selectElement.value as ColorMode

		this.ccs = this.createComponentControllers(this.view.element.ownerDocument)
		this.view.inputViews = this.ccs.map((cc) => cc.view)
	}
}
