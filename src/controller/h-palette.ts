import type {
	PointerData,
	PointerHandlerEvents,
	Value,
	ValueChangeOptions,
	ValueController,
	ViewProps,
} from '@tweakpane/core'
import {
	constrainRange,
	getHorizontalStepKeys,
	getStepForKey,
	mapRange,
	PointerHandler,
} from '@tweakpane/core'
import type { ColorPlus } from '../model/color-plus.js'
import { HPaletteView } from '../view/h-palette.js'

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

// eslint-disable-next-line ts/naming-convention
export class HPaletteController implements ValueController<ColorPlus, HPaletteView> {
	public readonly value: Value<ColorPlus>
	public readonly view: HPaletteView
	public readonly viewProps: ViewProps
	private readonly pointerHandler: PointerHandler

	constructor(doc: Document, config: Config) {
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)

		this.value = config.value
		this.viewProps = config.viewProps

		this.view = new HPaletteView(doc, {
			value: this.value,
			viewProps: this.viewProps,
		})

		this.pointerHandler = new PointerHandler(this.view.element)
		this.pointerHandler.emitter.on('down', this.onPointerDown)
		this.pointerHandler.emitter.on('move', this.onPointerMove)
		this.pointerHandler.emitter.on('up', this.onPointerUp)

		this.view.element.addEventListener('keydown', this.onKeyDown)
		this.view.element.addEventListener('keyup', this.onKeyUp)
	}

	private handlePointerEvent(d: PointerData, options: ValueChangeOptions): void {
		if (!d.point) {
			return
		}

		const hue = mapRange(constrainRange(d.point.x, 0, d.bounds.width), 0, d.bounds.width, 0, 360)

		const c = this.value.rawValue.clone()
		c.set('h', hue, 'hsv')
		this.value.setRawValue(c, options)
	}

	private onKeyDown(event: KeyboardEvent): void {
		const step = getStepForKey(
			1, // GetKeyScaleForColor(false),
			getHorizontalStepKeys(event),
		)
		if (step === 0) {
			return
		}

		const c = this.value.rawValue.clone()
		c.set('h', (value) => constrainRange(value + step, 0, 360), 'hsv')
		this.value.setRawValue(c, {
			forceEmit: false,
			last: false,
		})
	}

	private onKeyUp(event: KeyboardEvent): void {
		const step = getStepForKey(
			1, // GetKeyScaleForColor(false),
			getHorizontalStepKeys(event),
		)
		if (step === 0) {
			return
		}

		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		})
	}

	private onPointerDown(event: PointerHandlerEvents['down']): void {
		this.handlePointerEvent(event.data, {
			forceEmit: false,
			last: false,
		})
	}

	private onPointerMove(event: PointerHandlerEvents['move']): void {
		this.handlePointerEvent(event.data, {
			forceEmit: false,
			last: false,
		})
	}

	private onPointerUp(event: PointerHandlerEvents['up']): void {
		this.handlePointerEvent(event.data, {
			forceEmit: true,
			last: true,
		})
	}
}
