/*
 * Off-plane channel slider: a horizontal canvas ramp sweeping whichever OKLCH
 * channel the active layout assigns to the slider (lightness, chroma, or hue).
 * The ramp is drawn at the current color's other two channels (display-clamped)
 * so it previews the path the slider walks, and the marker tracks the channel's
 * position within its range. Because the ramp depends on the other channels, it
 * is redrawn whenever the color changes.
 */
import type { Value, View, ViewProps } from '@tweakpane/core'
import { ClassName } from '@tweakpane/core'
import type { Channel, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import { channelMax, LAYOUTS, unitToValue, valueToUnit } from '../model/channel.js'
import { computeGlobalMaxChroma, oklchToRgb, widestGamut } from '../model/gamut.js'

const cn = ClassName('hpl')
/** Ramp samples across the strip; the canvas is scaled up by CSS. */
const RAMP_SAMPLES = 256
/**
 * Fixed lightness/chroma for the hue ramp so every hue reads as a vivid target.
 * At lightness 0.75 the worst-case hues (cyan and blue) both hold chroma 0.126
 * inside sRGB, so the strip stays clip-free all the way around.
 */
const HUE_RAMP_LIGHTNESS = 0.75
const HUE_RAMP_CHROMA = 0.126

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

function clampByte(value: number): number {
	return Math.round(Math.max(0, Math.min(1, value)) * 255)
}

/** Whether a 2D canvas can be backed by Display-P3 (probe the real API). */
const supportsWideCanvas = ((): boolean => {
	try {
		const context = document.createElement('canvas').getContext('2d', {
			colorSpace: 'display-p3',
		})
		return context?.getContextAttributes().colorSpace === 'display-p3'
	} catch {
		return false
	}
})()

type Config = {
	gamuts: string[]
	paletteChannels: PlaneLayout
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class ChannelSliderView implements View {
	public readonly canvasElement: HTMLCanvasElement
	public readonly channel: Channel
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>
	/** Maximum value of the slider's channel (1, 360, or the global chroma max). */
	public get channelMax(): number {
		return channelMax(this.channel, this.globalMaxChroma)
	}
	private readonly globalMaxChroma: number

	private readonly markerElement: HTMLDivElement

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		this.value = config.value
		this.channel = LAYOUTS[config.paletteChannels].slider
		this.globalMaxChroma = computeGlobalMaxChroma(widestGamut(config.gamuts))

		this.value.emitter.on('change', this.onValueChange)

		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)
		config.viewProps.bindTabIndex(this.element)

		const canvasElement = doc.createElement('canvas')
		canvasElement.classList.add(cn('c'))
		canvasElement.height = 1
		canvasElement.width = RAMP_SAMPLES
		this.element.append(canvasElement)
		this.canvasElement = canvasElement

		const markerElement = doc.createElement('div')
		markerElement.classList.add(cn('m'))
		this.element.append(markerElement)
		this.markerElement = markerElement

		config.viewProps.handleDispose(() => {
			this.value.emitter.off('change', this.onValueChange)
		})

		this.update()
	}

	private oklchCoords(): Record<Channel, number> {
		const [l, c, h] = this.value.rawValue.getAll('oklch')
		return { c: finite(c), h: finite(h), l: finite(l) }
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		const target = supportsWideCanvas ? 'p3' : 'srgb'
		const colorSpace: PredefinedColorSpace = supportsWideCanvas ? 'display-p3' : 'srgb'
		const context = this.canvasElement.getContext('2d', { colorSpace })
		const coords = this.oklchCoords()
		// The hue ramp holds lightness and chroma fixed so every hue stays a legible
		// target; the lightness and chroma ramps preview the actual color path.
		const base: Record<Channel, number> =
			this.channel === 'h' ? { c: HUE_RAMP_CHROMA, h: coords.h, l: HUE_RAMP_LIGHTNESS } : coords

		if (context !== null) {
			const pixels = new Uint8ClampedArray(RAMP_SAMPLES * 4)
			for (let i = 0; i < RAMP_SAMPLES; i++) {
				const value = unitToValue(this.channel, i / (RAMP_SAMPLES - 1), this.globalMaxChroma)
				const sample: Record<Channel, number> = { ...base, [this.channel]: value }
				const [r, g, b] = oklchToRgb(sample.l, sample.c, sample.h, target)
				const offset = i * 4
				pixels[offset] = clampByte(r)
				pixels[offset + 1] = clampByte(g)
				pixels[offset + 2] = clampByte(b)
				pixels[offset + 3] = 255
			}

			context.putImageData(new ImageData(pixels, RAMP_SAMPLES, 1, { colorSpace }), 0, 0)
		}

		const unit = valueToUnit(this.channel, coords[this.channel], this.globalMaxChroma)
		this.markerElement.style.left = `${unit * 100}%`
		const [r, g, b] = oklchToRgb(base.l, base.c, base.h, 'srgb')
		this.markerElement.style.backgroundColor = `rgb(${clampByte(r)} ${clampByte(g)} ${clampByte(b)})`
	}
}
