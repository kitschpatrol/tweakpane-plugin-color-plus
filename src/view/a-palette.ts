import type { Value, View, ViewProps } from '@tweakpane/core'
import { ClassName, mapRange } from '@tweakpane/core'
import type { ColorPlus } from '../model/color-plus.js'

const cn = ClassName('apl')

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

// eslint-disable-next-line ts/naming-convention
export class APaletteView implements View {
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>
	private readonly colorElement: HTMLDivElement
	private readonly markerElement: HTMLDivElement
	private readonly previewElement: HTMLDivElement

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		this.value = config.value

		this.value.emitter.on('change', this.onValueChange)

		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)
		config.viewProps.bindTabIndex(this.element)

		const barElement = doc.createElement('div')
		barElement.classList.add(cn('b'))
		this.element.append(barElement)

		this.colorElement = doc.createElement('div')
		this.colorElement.classList.add(cn('c'))
		barElement.append(this.colorElement)

		this.markerElement = doc.createElement('div')
		this.markerElement.classList.add(cn('m'))
		this.element.append(this.markerElement)

		this.previewElement = doc.createElement('div')
		this.previewElement.classList.add(cn('p'))
		this.markerElement.append(this.previewElement)

		this.update()
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		const activeColor = this.value.rawValue.clone()
		activeColor.convert('srgb')
		const leftColor = activeColor.clone()
		leftColor.alpha = 0

		const rightColor = leftColor.clone()
		rightColor.alpha = 1

		const gradientComps = [
			'to right',
			leftColor.serialize({
				alpha: true,
				format: 'rgba',
				space: 'srgb',
				type: 'string',
			}),
			rightColor.serialize({
				alpha: true,
				format: 'rgba',
				space: 'srgb',
				type: 'string',
			}),
		]
		this.colorElement.style.background = `linear-gradient(${gradientComps.join(',')})`

		this.previewElement.style.backgroundColor = activeColor.serialize({
			alpha: true,
			format: 'rgba',
			space: 'srgb',
			type: 'string',
		})
		const left = mapRange(activeColor.alpha, 0, 1, 0, 100)
		this.markerElement.style.left = `${left}%`
	}
}
