import type { Value, ValueController, ViewProps } from '@tweakpane/core'
import {
	connectValues,
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	NumberTextController,
	parseNumber,
	ValueMap,
} from '@tweakpane/core'
import type { PaletteProjection, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import type { ColorType } from '../model/shared.js'
import type { ColorTextsMode } from '../view/color-texts.js'
import type { GamutLines } from '../view/plane-palette.js'
import { ColorPickerView } from '../view/color-picker.js'
import { APaletteController } from './a-palette.js'
import { ChannelSliderController } from './channel-slider.js'
import { ColorTextsController } from './color-texts.js'
import { PlanePaletteController } from './plane-palette.js'

type Config = {
	colorType: ColorType
	constrain: boolean
	gamutLabel: boolean
	gamutLines: GamutLines
	gamuts: string[]
	paletteChannels: PlaneLayout
	paletteProjection: PaletteProjection
	supportsAlpha: boolean
	textFields: boolean
	textsMode: ColorTextsMode
	value: Value<ColorPlus>
	viewProps: ViewProps
}

type AlphaControllers = {
	palette: APaletteController
	text: NumberTextController
}

export class ColorPickerController implements ValueController<ColorPlus, ColorPickerView> {
	public readonly value: Value<ColorPlus>
	public readonly view: ColorPickerView
	public readonly viewProps: ViewProps
	private readonly alphaIcs: AlphaControllers | undefined
	private readonly planeC: PlanePaletteController
	private readonly sliderC: ChannelSliderController
	private readonly textsC: ColorTextsController | undefined

	constructor(doc: Document, config: Config) {
		this.value = config.value
		this.viewProps = config.viewProps

		this.planeC = new PlanePaletteController(doc, {
			constrain: config.constrain,
			gamutLabel: config.gamutLabel,
			gamutLines: config.gamutLines,
			gamuts: config.gamuts,
			paletteChannels: config.paletteChannels,
			paletteProjection: config.paletteProjection,
			value: this.value,
			viewProps: this.viewProps,
		})
		this.sliderC = new ChannelSliderController(doc, {
			constrain: config.constrain,
			gamuts: config.gamuts,
			paletteChannels: config.paletteChannels,
			paletteProjection: config.paletteProjection,
			value: this.value,
			viewProps: this.viewProps,
		})

		this.alphaIcs = config.supportsAlpha
			? {
					palette: new APaletteController(doc, {
						value: this.value,
						viewProps: this.viewProps,
					}),
					text: new NumberTextController(doc, {
						parser: parseNumber,
						props: ValueMap.fromObject({
							formatter: createNumberFormatter(3),
							keyScale: 0.1,
							pointerScale: 0.01,
						}),
						value: createValue(0, {
							constraint: new DefiniteRangeConstraint({ min: 0, max: 1 }),
						}),
						viewProps: this.viewProps,
					}),
				}
			: undefined
		if (this.alphaIcs) {
			connectValues({
				backward(p, s) {
					p.alpha = s
					return p.clone()
				},
				forward: (p) => p.alpha,
				primary: this.value,
				secondary: this.alphaIcs.text.value,
			})
		}

		this.textsC = config.textFields
			? new ColorTextsController(doc, {
					colorType: config.colorType,
					supportsAlpha: config.supportsAlpha,
					textsMode: config.textsMode,
					value: this.value,
					viewProps: this.viewProps,
				})
			: undefined

		this.view = new ColorPickerView(doc, {
			alphaViews: this.alphaIcs
				? {
						palette: this.alphaIcs.palette.view,
						text: this.alphaIcs.text.view,
					}
				: undefined,
			planeView: this.planeC.view,
			sliderView: this.sliderC.view,
			supportsAlpha: config.supportsAlpha,
			textsView: this.textsC?.view,
			viewProps: this.viewProps,
		})
	}
}
