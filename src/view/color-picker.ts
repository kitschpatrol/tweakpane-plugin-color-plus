import type { NumberTextView, View, ViewProps } from '@tweakpane/core'
import { ClassName } from '@tweakpane/core'
import type { APaletteView } from './a-palette.js'
import type { ChannelSliderView } from './channel-slider.js'
import type { ColorTextsView } from './color-texts.js'
import type { PlanePaletteView } from './plane-palette.js'

const cn = ClassName('colp')

type AlphaViews = {
	palette: APaletteView
	text: NumberTextView
}

type Config = {
	alphaViews: AlphaViews | undefined
	planeView: PlanePaletteView
	sliderView: ChannelSliderView
	supportsAlpha: boolean
	textsView: ColorTextsView | undefined
	viewProps: ViewProps
}

export class ColorPickerView implements View {
	public readonly element: HTMLElement

	get allFocusableElements(): HTMLElement[] {
		const elements = [this.planeView.element, this.sliderView.element]
		if (this.textsView) {
			elements.push(
				this.textsView.modeSelectElement,
				...this.textsView.inputViews.map((v) => v.inputElement),
			)
		}

		if (this.alphaViews) {
			elements.push(this.alphaViews.palette.element, this.alphaViews.text.inputElement)
		}

		return elements
	}

	private readonly alphaViews: AlphaViews | undefined
	private readonly planeView: PlanePaletteView
	private readonly sliderView: ChannelSliderView
	private readonly textsView: ColorTextsView | undefined

	constructor(doc: Document, config: Config) {
		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)

		this.planeView = config.planeView
		const planeElement = doc.createElement('div')
		planeElement.classList.add(cn('lc'))
		planeElement.append(this.planeView.element)
		this.element.append(planeElement)

		this.sliderView = config.sliderView
		const sliderElement = doc.createElement('div')
		sliderElement.classList.add(cn('h'))
		sliderElement.append(this.sliderView.element)
		this.element.append(sliderElement)

		this.textsView = config.textsView
		if (this.textsView) {
			const rgbElement = doc.createElement('div')
			rgbElement.classList.add(cn('rgb'))
			rgbElement.append(this.textsView.element)
			this.element.append(rgbElement)
		}

		this.alphaViews = config.alphaViews
		if (config.alphaViews) {
			const aElement = doc.createElement('div')
			aElement.classList.add(cn('a'))

			const apElement = doc.createElement('div')
			apElement.classList.add(cn('ap'))
			apElement.append(config.alphaViews.palette.element)
			aElement.append(apElement)

			const atElement = doc.createElement('div')
			atElement.classList.add(cn('at'))
			atElement.append(config.alphaViews.text.element)
			aElement.append(atElement)

			this.element.append(aElement)
		}
	}
}
