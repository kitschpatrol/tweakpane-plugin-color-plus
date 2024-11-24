import {
	getHorizontalStepKeys,
	getStepForKey,
	type PointerData,
	PointerHandler,
	type PointerHandlerEvents,
	type Value,
	type ValueChangeOptions,
	type ValueController,
	type ViewProps,
} from '@tweakpane/core'
import { type ColorPlus } from '../model/color-plus.js'
import { APaletteView } from '../view/a-palette.js'

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class APaletteController implements ValueController<ColorPlus, APaletteView> {
	private readonly pointerHandler: PointerHandler
	public readonly value: Value<ColorPlus>
	public readonly view: APaletteView
	public readonly viewProps: ViewProps

	constructor(doc: Document, config: Config) {
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)

		this.value = config.value
		this.viewProps = config.viewProps

		this.view = new APaletteView(doc, {
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

		const c = this.value.rawValue.clone()
		c.alpha = d.point.x / d.bounds.width
		this.value.setRawValue(c, options)
	}

	private onKeyDown(event_: KeyboardEvent): void {
		const step = getStepForKey(
			0.1, // GetKeyScaleForColor(true),
			getHorizontalStepKeys(event_),
		)
		if (step === 0) {
			return
		}

		const c = this.value.rawValue.clone()
		c.set('alpha', (value) => value + step)

		this.value.setRawValue(c, {
			forceEmit: false,
			last: false,
		})
	}

	private onKeyUp(event_: KeyboardEvent): void {
		const step = getStepForKey(
			0.1, // GetKeyScaleForColor(true),
			getHorizontalStepKeys(event_),
		)
		if (step === 0) {
			return
		}

		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		})
	}

	private onPointerDown(event_: PointerHandlerEvents['down']): void {
		this.handlePointerEvent(event_.data, {
			forceEmit: false,
			last: false,
		})
	}

	private onPointerMove(event_: PointerHandlerEvents['move']): void {
		this.handlePointerEvent(event_.data, {
			forceEmit: false,
			last: false,
		})
	}

	private onPointerUp(event_: PointerHandlerEvents['up']): void {
		this.handlePointerEvent(event_.data, {
			forceEmit: true,
			last: true,
		})
	}
}
