import type {
	Formatter,
	Parser,
	PickerLayout,
	Value,
	ValueController,
	ViewProps,
} from '@tweakpane/core'
import type { ColorType } from '@tweakpane/core/dist/input-binding/color/model/color-model.js'
import {
	bindFoldable,
	connectValues,
	findNextTarget,
	Foldable,
	forceCast,
	PopupController,
	supportsTouch,
	TextController,
	ValueMap,
} from '@tweakpane/core'
import type { ColorPlus } from '../model/color-plus.js'
import { ColorView } from '../view/color.js'
import { ColorPickerController } from './color-picker.js'
import { ColorSwatchController } from './color-swatch.js'

type Config = {
	colorType: ColorType
	expanded: boolean
	formatter: Formatter<ColorPlus>
	parser: Parser<ColorPlus>
	pickerLayout: PickerLayout
	supportsAlpha: boolean
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class ColorController implements ValueController<ColorPlus, ColorView> {
	public readonly value: Value<ColorPlus>
	public readonly view: ColorView
	public readonly viewProps: ViewProps
	get textController(): TextController<ColorPlus> {
		return this.textC
	}
	private readonly foldable: Foldable
	private readonly pickerC: ColorPickerController
	private readonly popC: null | PopupController
	private readonly swatchC: ColorSwatchController

	private readonly textC: TextController<ColorPlus>

	constructor(doc: Document, config: Config) {
		this.onButtonBlur = this.onButtonBlur.bind(this)
		this.onButtonClick = this.onButtonClick.bind(this)
		this.onPopupChildBlur = this.onPopupChildBlur.bind(this)
		this.onPopupChildKeydown = this.onPopupChildKeydown.bind(this)

		this.value = config.value
		this.viewProps = config.viewProps

		// This.value.emitter.on('change', (event) => {
		// 	console.log('----------------------------------');
		// 	console.log(String(event.rawValue));
		// });

		this.foldable = Foldable.create(config.expanded)

		this.swatchC = new ColorSwatchController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		})
		const { buttonElement } = this.swatchC.view
		buttonElement.addEventListener('blur', this.onButtonBlur)
		buttonElement.addEventListener('click', this.onButtonClick)

		this.textC = new TextController(doc, {
			parser: config.parser,
			props: ValueMap.fromObject({
				formatter: config.formatter,
			}),
			value: this.value,
			viewProps: this.viewProps,
		})

		this.view = new ColorView(doc, {
			foldable: this.foldable,
			pickerLayout: config.pickerLayout,
		})
		this.view.swatchElement.append(this.swatchC.view.element)
		this.view.textElement.append(this.textC.view.element)

		this.popC =
			config.pickerLayout === 'popup'
				? new PopupController(doc, {
						viewProps: this.viewProps,
					})
				: null

		const pickerC = new ColorPickerController(doc, {
			colorType: config.colorType,
			supportsAlpha: config.supportsAlpha,
			value: this.value,
			viewProps: this.viewProps,
		})
		for (const element of pickerC.view.allFocusableElements) {
			element.addEventListener('blur', this.onPopupChildBlur)
			element.addEventListener('keydown', this.onPopupChildKeydown)
		}

		this.pickerC = pickerC

		if (this.popC) {
			this.view.element.append(this.popC.view.element)
			this.popC.view.element.append(pickerC.view.element)

			connectValues({
				backward: (_, s) => s,
				forward: (p) => p,
				primary: this.foldable.value('expanded'),
				secondary: this.popC.shows,
			})
		} else if (this.view.pickerElement) {
			this.view.pickerElement.append(this.pickerC.view.element)

			bindFoldable(this.foldable, this.view.pickerElement)
		}
	}

	private onButtonBlur(event: FocusEvent) {
		if (!this.popC) {
			return
		}

		const { element } = this.view
		const nextTarget: HTMLElement | null = forceCast(event.relatedTarget)
		if (!nextTarget || !element.contains(nextTarget)) {
			this.popC.shows.rawValue = false
		}
	}

	private onButtonClick() {
		this.foldable.set('expanded', !this.foldable.get('expanded'))
		if (this.foldable.get('expanded')) {
			this.pickerC.view.allFocusableElements[0].focus()
		}
	}

	private onPopupChildBlur(event: FocusEvent): void {
		if (!this.popC) {
			return
		}

		const { element } = this.popC.view
		const nextTarget = findNextTarget(event)
		if (nextTarget && element.contains(nextTarget)) {
			// Next target is in the picker
			return
		}

		if (
			nextTarget &&
			nextTarget === this.swatchC.view.buttonElement &&
			!supportsTouch(element.ownerDocument)
		) {
			// Next target is the trigger button
			return
		}

		this.popC.shows.rawValue = false
	}

	private onPopupChildKeydown(event: KeyboardEvent): void {
		if (this.popC) {
			if (event.key === 'Escape') {
				this.popC.shows.rawValue = false
			}
		} else if (this.view.pickerElement && event.key === 'Escape') {
			this.swatchC.view.buttonElement.focus()
		}
	}
}
