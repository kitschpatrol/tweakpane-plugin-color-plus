import type {
	Formatter,
	Parser,
	PickerLayout,
	Value,
	ValueController,
	ViewProps,
} from '@tweakpane/core'
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
import type { PaletteProjection, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import type { ColorType, GamutMethod } from '../model/shared.js'
import type { ColorTextsMode } from '../view/color-texts.js'
import type { GamutLines } from '../view/plane-palette.js'
import { clampColorToGamut } from '../utilities.js'
import { ColorView } from '../view/color.js'
import { ColorPickerController } from './color-picker.js'
import { ColorSwatchController } from './color-swatch.js'

type Config = {
	colorType: ColorType
	constrain: boolean
	expanded: boolean
	formatter: Formatter<ColorPlus>
	gamutLabel: boolean
	gamutLines: GamutLines
	gamuts: string[]
	paletteChannels: PlaneLayout
	paletteProjection: PaletteProjection
	parser: Parser<ColorPlus>
	pickerLayout: PickerLayout
	supportsAlpha: boolean
	swatchFallback: GamutMethod
	textFields: boolean
	textsMode: ColorTextsMode
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

		// With gamut constraining on, pull a held out-of-gamut color (initial
		// value, or a rebuild after constrain is toggled on) into the
		// widest configured gamut and write it back, so the bound value never
		// starts out of gamut.
		if (config.constrain) {
			const clamped = this.value.rawValue.clone()
			if (clampColorToGamut(clamped, config.gamuts)) {
				this.value.setRawValue(clamped, { forceEmit: true, last: true })
			}
		}

		this.foldable = Foldable.create(config.expanded)

		this.swatchC = new ColorSwatchController(doc, {
			swatchFallback: config.swatchFallback,
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
			constrain: config.constrain,
			gamutLabel: config.gamutLabel,
			gamutLines: config.gamutLines,
			gamuts: config.gamuts,
			paletteChannels: config.paletteChannels,
			paletteProjection: config.paletteProjection,
			supportsAlpha: config.supportsAlpha,
			textFields: config.textFields,
			textsMode: config.textsMode,
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
			this.pickerC.view.allFocusableElements[0]?.focus()
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
