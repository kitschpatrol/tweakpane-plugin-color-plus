import {
	constrainRange,
	getHorizontalStepKeys,
	getStepForKey,
	getVerticalStepKeys,
	isArrowKey,
	mapRange,
	type PointerData,
	PointerHandler,
	type PointerHandlerEvents,
	type Value,
	type ValueChangeOptions,
	type ValueController,
	type ViewProps,
} from '@tweakpane/core'
import { type ColorPlus } from '../model/color-plus.js'
import { SvPaletteView } from '../view/sv-palette.js'

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class SvPaletteController implements ValueController<ColorPlus, SvPaletteView> {
	public readonly value: Value<ColorPlus>
	public readonly view: SvPaletteView
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

		this.view = new SvPaletteView(doc, {
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

		const saturation = constrainRange(mapRange(d.point.x, 0, d.bounds.width, 0, 100), 0, 100)
		const value = constrainRange(mapRange(d.point.y, 0, d.bounds.height, 100, 0), 0, 100)

		const c = this.value.rawValue.clone()
		const h = c.get('h', 'hsv')
		c.setAll([h, saturation, value], 'hsv')

		this.value.setRawValue(c.clone(), options)
	}

	private onKeyDown(event_: KeyboardEvent): void {
		if (isArrowKey(event_.key)) {
			event_.preventDefault()
		}

		const keyScale = 1 // GetKeyScaleForColor(false);
		const ds = getStepForKey(keyScale, getHorizontalStepKeys(event_))
		const dv = getStepForKey(keyScale, getVerticalStepKeys(event_))
		if (ds === 0 && dv === 0) {
			return
		}

		// TODO constrain

		const c = this.value.rawValue
		const [h, s, v] = c.getAll('hsv')
		c.setAll([h, s === null ? null : s + ds, v === null ? null : v + dv], 'hsv')
		this.value.setRawValue(c.clone(), {
			forceEmit: false,
			last: false,
		})
	}

	private onKeyUp(event_: KeyboardEvent): void {
		const keyScale = 1 // GetKeyScaleForColor(false);
		const ds = getStepForKey(keyScale, getHorizontalStepKeys(event_))
		const dv = getStepForKey(keyScale, getVerticalStepKeys(event_))
		if (ds === 0 && dv === 0) {
			return
		}

		// TODO constrain

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
