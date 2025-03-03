import {
	connectValues,
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	NumberTextController,
	parseNumber,
	type Value,
	type ValueController,
	ValueMap,
	type ViewProps,
} from '@tweakpane/core'
import { type ColorType } from '@tweakpane/core/dist/input-binding/color/model/color-model.js'
import { type ColorPlus } from '../model/color-plus.js'
import { ColorPickerView } from '../view/color-picker.js'
import { APaletteController } from './a-palette.js'
import { ColorTextsController } from './color-texts.js'
import { HPaletteController } from './h-palette.js'
import { SvPaletteController } from './sv-palette.js'

type Config = {
	colorType: ColorType
	supportsAlpha: boolean
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class ColorPickerController implements ValueController<ColorPlus, ColorPickerView> {
	public readonly value: Value<ColorPlus>

	public readonly view: ColorPickerView
	public readonly viewProps: ViewProps
	get textsController(): ColorTextsController {
		return this.textsC
	}
	private readonly alphaIcs: null | {
		palette: APaletteController
		text: NumberTextController
	}
	private readonly hPaletteC: HPaletteController
	private readonly svPaletteC: SvPaletteController

	private readonly textsC: ColorTextsController

	constructor(doc: Document, config: Config) {
		this.value = config.value
		this.viewProps = config.viewProps

		this.hPaletteC = new HPaletteController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		})
		this.svPaletteC = new SvPaletteController(doc, {
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
			: null
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

		this.textsC = new ColorTextsController(doc, {
			colorType: config.colorType,
			value: this.value,
			viewProps: this.viewProps,
		})

		this.view = new ColorPickerView(doc, {
			alphaViews: this.alphaIcs
				? {
						palette: this.alphaIcs.palette.view,
						text: this.alphaIcs.text.view,
					}
				: null,
			hPaletteView: this.hPaletteC.view,
			supportsAlpha: config.supportsAlpha,
			svPaletteView: this.svPaletteC.view,
			textsView: this.textsC.view,
			viewProps: this.viewProps,
		})
	}
}
