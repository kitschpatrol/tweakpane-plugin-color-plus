import type { NumberTextView, View, ViewProps } from '@tweakpane/core'
import { ClassName } from '@tweakpane/core'
import type { APaletteView } from './a-palette.js'
import type { ColorTextsView } from './color-texts.js'
import type { HPaletteView } from './h-palette.js'
import type { SvPaletteView } from './sv-palette.js'

const cn = ClassName('colp')

type Config = {
	alphaViews: null | {
		palette: APaletteView
		text: NumberTextView
	}
	hPaletteView: HPaletteView
	supportsAlpha: boolean
	svPaletteView: SvPaletteView
	textsView: ColorTextsView
	viewProps: ViewProps
}

export class ColorPickerView implements View {
	public readonly element: HTMLElement

	get allFocusableElements(): HTMLElement[] {
		const elements = [
			this.svPaletteView.element,
			this.hPaletteView.element,
			this.textsView.modeSelectElement,
			...this.textsView.inputViews.map((v) => v.inputElement),
		]
		if (this.alphaViews) {
			elements.push(this.alphaViews.palette.element, this.alphaViews.text.inputElement)
		}

		return elements
	}

	private readonly alphaViews: null | {
		palette: APaletteView
		text: NumberTextView
	} = null
	private readonly hPaletteView: HPaletteView
	private readonly svPaletteView: SvPaletteView

	private readonly textsView: ColorTextsView

	constructor(doc: Document, config: Config) {
		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)

		const hsvElement = doc.createElement('div')
		hsvElement.classList.add(cn('hsv'))

		const svElement = doc.createElement('div')
		svElement.classList.add(cn('sv'))
		this.svPaletteView = config.svPaletteView
		svElement.append(this.svPaletteView.element)
		hsvElement.append(svElement)

		const hElement = doc.createElement('div')
		hElement.classList.add(cn('h'))
		this.hPaletteView = config.hPaletteView
		hElement.append(this.hPaletteView.element)
		hsvElement.append(hElement)
		this.element.append(hsvElement)

		const rgbElement = doc.createElement('div')
		rgbElement.classList.add(cn('rgb'))
		this.textsView = config.textsView
		rgbElement.append(this.textsView.element)
		this.element.append(rgbElement)

		if (config.alphaViews) {
			this.alphaViews = {
				palette: config.alphaViews.palette,
				text: config.alphaViews.text,
			}

			const aElement = doc.createElement('div')
			aElement.classList.add(cn('a'))

			const apElement = doc.createElement('div')
			apElement.classList.add(cn('ap'))
			apElement.append(this.alphaViews.palette.element)
			aElement.append(apElement)

			const atElement = doc.createElement('div')
			atElement.classList.add(cn('at'))
			atElement.append(this.alphaViews.text.element)
			aElement.append(atElement)

			this.element.append(aElement)
		}
	}
}
