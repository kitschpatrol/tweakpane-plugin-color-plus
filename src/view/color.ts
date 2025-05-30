import type { Foldable, PickerLayout, View } from '@tweakpane/core'
import { bindValueMap, ClassName, valueToClassName } from '@tweakpane/core'

type Config = {
	foldable: Foldable
	pickerLayout: PickerLayout
}

const cn = ClassName('col')

export class ColorView implements View {
	public readonly element: HTMLElement
	public readonly pickerElement: HTMLElement | null
	public readonly swatchElement: HTMLElement
	public readonly textElement: HTMLElement

	constructor(doc: Document, config: Config) {
		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.foldable.bindExpandedClass(this.element, cn(undefined, 'expanded'))
		bindValueMap(config.foldable, 'completed', valueToClassName(this.element, cn(undefined, 'cpl')))

		const headElement = doc.createElement('div')
		headElement.classList.add(cn('h'))
		this.element.append(headElement)

		const swatchElement = doc.createElement('div')
		swatchElement.classList.add(cn('s'))
		headElement.append(swatchElement)
		this.swatchElement = swatchElement

		const textElement = doc.createElement('div')
		textElement.classList.add(cn('t'))
		headElement.append(textElement)
		this.textElement = textElement

		if (config.pickerLayout === 'inline') {
			const pickerElement = doc.createElement('div')
			pickerElement.classList.add(cn('p'))
			this.element.append(pickerElement)
			this.pickerElement = pickerElement
		} else {
			this.pickerElement = null
		}
	}
}
