/*
 * Interaction layer for the OKLCH picker plane. Maps pointer and keyboard input
 * onto OKLCH coordinates through the active layout, deferring all geometry to
 * the view: a pointer (or arrow key) becomes a normalized plane position, and
 * the view resolves it to an in-gamut color — snapping to the nearest boundary
 * point when the pointer falls outside the gamut in perceptual mode.
 */
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
	getVerticalStepKeys,
	isArrowKey,
	PointerHandler,
} from '@tweakpane/core'
import type { Channel, PaletteProjection, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import type { GamutLines } from '../view/plane-palette.js'
import { LAYOUTS } from '../model/channel.js'
import { PlanePaletteView } from '../view/plane-palette.js'

/** Marker nudge per arrow key, as a fraction of the plane. */
const KEY_STEP = 1 / 100
/** Chroma below this reads as achromatic; preserve the last concrete hue. */
const ACHROMATIC_CHROMA = 1e-4

type Config = {
	constrain: boolean
	gamutLabel: boolean
	gamutLines: GamutLines
	gamuts: string[]
	paletteChannels: PlaneLayout
	paletteProjection: PaletteProjection
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class PlanePaletteController implements ValueController<ColorPlus, PlanePaletteView> {
	public readonly value: Value<ColorPlus>
	public readonly view: PlanePaletteView
	public readonly viewProps: ViewProps
	// True when hue is a plane axis (set by the marker position) rather than the
	// off-plane slider; it then must be honored even on the achromatic edge.
	private readonly hueOnPlane: boolean
	private lastHue: number | undefined
	private readonly pointerHandler: PointerHandler

	constructor(doc: Document, config: Config) {
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)

		this.value = config.value
		this.viewProps = config.viewProps
		this.hueOnPlane = LAYOUTS[config.paletteChannels].slider !== 'h'

		this.view = new PlanePaletteView(doc, {
			constrain: config.constrain,
			gamutLabel: config.gamutLabel,
			gamutLines: config.gamutLines,
			gamuts: config.gamuts,
			paletteChannels: config.paletteChannels,
			paletteProjection: config.paletteProjection,
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

		const coords = this.view.resolvePointer(d.point.x / d.bounds.width, d.point.y / d.bounds.height)
		this.writeColor(coords, options)
	}

	private onKeyDown(event_: KeyboardEvent): void {
		if (isArrowKey(event_.key)) {
			event_.preventDefault()
		}

		const dx = getStepForKey(KEY_STEP, getHorizontalStepKeys(event_))
		const dy = getStepForKey(KEY_STEP, getVerticalStepKeys(event_))
		if (dx === 0 && dy === 0) {
			return
		}

		const position = this.view.markerPosition()
		// Screen Y grows downward, so an upward step decreases the Y fraction.
		const coords = this.view.resolvePointer(
			constrainRange(position.x + dx, 0, 1),
			constrainRange(position.y - dy, 0, 1),
		)
		this.writeColor(coords, { forceEmit: false, last: false })
	}

	private onKeyUp(event_: KeyboardEvent): void {
		const dx = getStepForKey(KEY_STEP, getHorizontalStepKeys(event_))
		const dy = getStepForKey(KEY_STEP, getVerticalStepKeys(event_))
		if (dx === 0 && dy === 0) {
			return
		}

		this.value.setRawValue(this.value.rawValue, { forceEmit: true, last: true })
	}

	private onPointerDown(event_: PointerHandlerEvents['down']): void {
		this.handlePointerEvent(event_.data, { forceEmit: false, last: false })
	}

	private onPointerMove(event_: PointerHandlerEvents['move']): void {
		this.handlePointerEvent(event_.data, { forceEmit: false, last: false })
	}

	private onPointerUp(event_: PointerHandlerEvents['up']): void {
		this.handlePointerEvent(event_.data, { forceEmit: true, last: true })
	}

	private writeColor(coords: Record<Channel, number>, options: ValueChangeOptions): void {
		// When hue comes from the slider, an achromatic pick has no defined hue, so
		// carry the last concrete one — dragging chroma back up then won't snap the
		// hue to zero. When hue is a plane axis the marker position sets it directly,
		// so honor it even on the achromatic (chroma 0) edge; otherwise the marker
		// would stick there, unable to slide along the hue it can't write.
		const carryHue = this.hueOnPlane ? false : coords.c <= ACHROMATIC_CHROMA
		const hue = carryHue ? (this.lastHue ?? coords.h) : coords.h
		if (!carryHue) {
			this.lastHue = coords.h
		}

		const c = this.value.rawValue.clone()
		c.setAll([coords.l, coords.c, hue], 'oklch')
		this.value.setRawValue(c, options)
	}
}
