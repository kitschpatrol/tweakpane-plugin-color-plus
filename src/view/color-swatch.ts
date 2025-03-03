import { ClassName, type Value, type View, type ViewProps } from '@tweakpane/core'
import { type ColorPlus } from '../model/color-plus.js'

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

const cn = ClassName('colsw')

export class ColorSwatchView implements View {
	public readonly buttonElement: HTMLButtonElement
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>
	private readonly swatchFallbackElement: HTMLDivElement
	private readonly swatchRealElement: HTMLDivElement

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		config.value.emitter.on('change', this.onValueChange)
		this.value = config.value

		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)

		this.swatchRealElement = doc.createElement('div')
		this.swatchRealElement.classList.add(cn('sw'))
		this.element.append(this.swatchRealElement)

		this.swatchFallbackElement = doc.createElement('div')
		this.swatchFallbackElement.style.width = '100%'
		this.swatchFallbackElement.style.height = '100%'
		this.swatchFallbackElement.style.clipPath = 'polygon(100% 0%, 0% 100%, 100% 100%)'
		this.swatchRealElement.append(this.swatchFallbackElement)

		const buttonElement = doc.createElement('button')
		buttonElement.classList.add(cn('b'))
		config.viewProps.bindDisabled(buttonElement)
		this.element.append(buttonElement)
		this.buttonElement = buttonElement

		this.update()
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		const value = this.value.rawValue

		this.swatchRealElement.style.opacity = value.alpha.toString()
		this.swatchRealElement.style.backgroundColor = value.serialize({
			alpha: false,
			format: 'oklch',
			space: 'oklch',
			type: 'string',
		})

		const fallbackColor = value.clone()
		fallbackColor.toGamut('srgb')
		this.swatchFallbackElement.style.backgroundColor = fallbackColor.serialize({
			alpha: false,
			format: 'oklch',
			space: 'oklch',
			type: 'string',
		})
	}
}
