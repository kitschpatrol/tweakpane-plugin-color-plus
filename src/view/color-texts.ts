import {
	bindValue,
	ClassName,
	createSvgIconElement,
	type InputView,
	removeChildElements,
	type Value,
	type View,
	type ViewProps,
} from '@tweakpane/core'

export type ColorTextsMode = 'hex' | 'hsl' | 'hsv' | 'srgb'

type Config = {
	inputViews: InputView[]
	mode: Value<ColorTextsMode>
	viewProps: ViewProps
}

const cn = ClassName('coltxt')

function createModeSelectElement(doc: Document): HTMLSelectElement {
	const selectElement = doc.createElement('select')
	const items = [
		{ text: 'RGB', value: 'srgb' },
		{ text: 'HSL', value: 'hsl' },
		{ text: 'HSV', value: 'hsv' },
		{ text: 'HEX', value: 'hex' },
		// {text: 'OKLCH', value: 'oklch'},
	]
	selectElement.append(
		items.reduce((frag, item) => {
			const optElement = doc.createElement('option')
			optElement.textContent = item.text
			optElement.value = item.value
			frag.append(optElement)
			return frag
		}, doc.createDocumentFragment()),
	)
	return selectElement
}

export class ColorTextsView implements View {
	private readonly inputsElement: HTMLElement
	private inputViewsInternal: InputView[]
	private readonly modeElement: HTMLSelectElement
	public readonly element: HTMLElement

	constructor(doc: Document, config: Config) {
		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)

		const modeElementContainer = doc.createElement('div')
		modeElementContainer.classList.add(cn('m'))
		this.modeElement = createModeSelectElement(doc)
		this.modeElement.classList.add(cn('ms'))
		modeElementContainer.append(this.modeSelectElement)
		config.viewProps.bindDisabled(this.modeElement)

		const modeMarkerElement = doc.createElement('div')
		modeMarkerElement.classList.add(cn('mm'))
		modeMarkerElement.append(createSvgIconElement(doc, 'dropdown'))
		modeElementContainer.append(modeMarkerElement)

		this.element.append(modeElementContainer)

		const inputsElement = doc.createElement('div')
		inputsElement.classList.add(cn('w'))
		this.element.append(inputsElement)
		this.inputsElement = inputsElement

		this.inputViewsInternal = config.inputViews
		this.applyInputViewsInternal()

		bindValue(config.mode, (mode) => {
			this.modeElement.value = mode
		})
	}

	private applyInputViewsInternal() {
		removeChildElements(this.inputsElement)

		const doc = this.element.ownerDocument
		for (const v of this.inputViewsInternal) {
			const compElement = doc.createElement('div')
			compElement.classList.add(cn('c'))
			compElement.append(v.element)
			this.inputsElement.append(compElement)
		}
	}

	get inputViews(): InputView[] {
		return this.inputViewsInternal
	}

	set inputViews(inputViews: InputView[]) {
		this.inputViewsInternal = inputViews
		this.applyInputViewsInternal()
	}

	get modeSelectElement(): HTMLSelectElement {
		return this.modeElement
	}
}
