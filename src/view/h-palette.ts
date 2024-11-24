import { ClassName, mapRange, type Value, type View, type ViewProps } from '@tweakpane/core'
import { type ColorPlus } from '../model/color-plus.js'

const cn = ClassName('hpl')

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class HPaletteView implements View {
	private readonly markerElement: HTMLDivElement
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		this.value = config.value

		this.value.emitter.on('change', this.onValueChange)

		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)
		config.viewProps.bindTabIndex(this.element)

		const colorElement = doc.createElement('div')
		colorElement.classList.add(cn('c'))
		this.element.append(colorElement)

		const markerElementContainer = doc.createElement('div')
		markerElementContainer.classList.add(cn('m'))
		this.element.append(markerElementContainer)
		this.markerElement = markerElementContainer

		this.update()
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		const backgroundColor = this.value.rawValue.clone()
		const h = backgroundColor.get('h', 'hsv')
		backgroundColor.setAll([h, 100, 100], 'hsv')
		backgroundColor.alpha = 1

		this.markerElement.style.backgroundColor = backgroundColor.serialize({
			alpha: false,
			format: 'rgba',
			space: 'srgb',
			type: 'string',
		})

		const left = mapRange(h, 0, 360, 0, 100)
		this.markerElement.style.left = `${left}%`
	}
}
