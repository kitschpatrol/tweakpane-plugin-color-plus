/*
 * Interaction layer for the off-plane channel slider. Pointer and arrow-key
 * input edit whichever OKLCH channel the layout assigns to the slider; hue
 * wraps at 360 while lightness and chroma clamp to their ranges.
 *
 * With gamut constraining on, a move that would leave the widest configured
 * gamut never pushes the color out; the channel being edited is preserved as
 * far as the gamut allows and the others give way:
 * - lightness / hue edits shed chroma (constant lightness and hue)
 * - chroma edits slide lightness into the in-gamut band at the new chroma
 *   (constant chroma and hue), capping chroma at the hue's cusp — so the
 *   marker rides a gamut island's contour instead of sticking to one row
 *
 * In OKHSV mode the hue slider instead holds the OKHSV saturation/value pair
 * fixed and re-derives lightness/chroma through the new hue's profile, like a
 * classic HSV picker: the plane reticle stays put and the color stays in
 * gamut by construction.
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
	mapRange,
	PointerHandler,
} from '@tweakpane/core'
import type { PaletteProjection, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import { LAYOUTS, planeBand } from '../model/channel.js'
import { lightnessRange, maxChroma, widestGamut } from '../model/gamut.js'
import {
	buildOkhsvProfile,
	lightnessChromaToOkhsv,
	okhsvToLightnessChroma,
} from '../model/okhsv.js'
import { clampColorToGamut } from '../utilities.js'
import { ChannelSliderView } from '../view/channel-slider.js'

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

type Config = {
	constrain: boolean
	gamuts: string[]
	paletteChannels: PlaneLayout
	paletteProjection: PaletteProjection
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class ChannelSliderController implements ValueController<ColorPlus, ChannelSliderView> {
	public readonly value: Value<ColorPlus>
	public readonly view: ChannelSliderView
	public readonly viewProps: ViewProps
	private readonly constrain: boolean
	private readonly gamuts: string[]
	private readonly pointerHandler: PointerHandler
	private readonly useOkhsv: boolean
	private readonly widestGamutId: string

	private get keyScale(): number {
		const { channel } = this.view
		if (channel === 'h') {
			return 1
		}

		if (channel === 'l') {
			return 1 / 100
		}

		return this.view.channelMax / 100
	}

	constructor(doc: Document, config: Config) {
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)

		this.value = config.value
		this.viewProps = config.viewProps
		this.constrain = config.constrain
		this.gamuts = config.gamuts
		this.widestGamutId = widestGamut(config.gamuts)
		// Mirrors the plane view's OKHSV condition: only for the lightness×chroma
		// layouts (hue on the slider).
		const band = planeBand(LAYOUTS[config.paletteChannels])
		this.useOkhsv =
			config.paletteProjection === 'okhsv' && band.bandChannel === 'c' && band.iterChannel === 'l'

		this.view = new ChannelSliderView(doc, {
			gamuts: config.gamuts,
			paletteChannels: config.paletteChannels,
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

	/**
	 * Keep the edited chroma and slide lightness into the in-gamut band at the
	 * new chroma instead, capping chroma at the hue's cusp — shedding chroma here
	 * would undo the very edit being made.
	 */
	private clampLightnessToBand(color: ColorPlus): void {
		const [l, c, h] = color.getAll('oklch')
		const lightness = finite(l)
		let chroma = finite(c)
		const hue = finite(h)

		let band = lightnessRange(chroma, hue, this.widestGamutId)
		if (band === undefined) {
			// The chroma exceeds what this hue reaches at any lightness: cap it at
			// the cusp. Near the cusp the band can be thinner than lightnessRange's
			// scan step, so fall back to the cusp point itself.
			const profile = buildOkhsvProfile(hue, this.widestGamutId)
			chroma = Math.min(chroma, profile.cuspChroma)
			band = lightnessRange(chroma, hue, this.widestGamutId) ?? [
				profile.cuspLightness,
				profile.cuspLightness,
			]
		}

		const banded = constrainRange(lightness, band[0], band[1])
		if (banded !== lightness || chroma !== finite(c)) {
			color.setAll([banded, chroma, hue], 'oklch')
		}
	}

	private clampToChannel(value: number): number {
		const max = this.view.channelMax
		if (this.view.channel === 'h') {
			return ((value % max) + max) % max
		}

		return constrainRange(value, 0, max)
	}

	private handlePointerEvent(d: PointerData, options: ValueChangeOptions): void {
		if (!d.point) {
			return
		}

		const value = mapRange(
			constrainRange(d.point.x, 0, d.bounds.width),
			0,
			d.bounds.width,
			0,
			this.view.channelMax,
		)
		this.writeChannel(value, options)
	}

	private onKeyDown(event_: KeyboardEvent): void {
		const step = getStepForKey(this.keyScale, getHorizontalStepKeys(event_))
		if (step === 0) {
			return
		}

		const channelIndex = this.view.channel === 'l' ? 0 : this.view.channel === 'c' ? 1 : 2
		const current = finite(this.value.rawValue.getAll('oklch')[channelIndex])
		this.writeChannel(this.clampToChannel(current + step), { forceEmit: false, last: false })
	}

	private onKeyUp(event_: KeyboardEvent): void {
		const step = getStepForKey(this.keyScale, getHorizontalStepKeys(event_))
		if (step === 0) {
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

	/**
	 * Hold the color's OKHSV saturation/value fixed and re-derive
	 * lightness/chroma through the new hue's profile, so a hue drag moves the
	 * color around the gamut without the plane reticle wiggling.
	 */
	private rideOkhsvHue(color: ColorPlus, hue: number): void {
		const [l, c, h] = color.getAll('oklch')
		const oldProfile = buildOkhsvProfile(finite(h), this.widestGamutId)
		const [s, v] = lightnessChromaToOkhsv(oldProfile, finite(l), finite(c))
		const profile = buildOkhsvProfile(hue, this.widestGamutId)
		const [lightness, chroma] = okhsvToLightnessChroma(profile, s, v)
		// The profile is a piecewise-linear sample of maxChroma, so its boundary
		// can sit a rounding step past the true gamut; clamp chroma so a hue ride
		// never lands out of gamut (mirrors the plane's OKHSV pick).
		color.setAll(
			[lightness, Math.min(chroma, maxChroma(lightness, hue, this.widestGamutId)), hue],
			'oklch',
		)
	}

	private writeChannel(target: number, options: ValueChangeOptions): void {
		const color = this.value.rawValue.clone()
		if (this.useOkhsv && this.view.channel === 'h') {
			this.rideOkhsvHue(color, target)
		} else {
			color.set(this.view.channel, target, 'oklch')
			if (this.constrain) {
				if (this.view.channel === 'c') {
					this.clampLightnessToBand(color)
				} else {
					clampColorToGamut(color, this.gamuts)
				}
			}
		}

		this.value.setRawValue(color, options)
	}
}
