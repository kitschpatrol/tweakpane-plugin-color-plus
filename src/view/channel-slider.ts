/*
 * Off-plane channel slider: a horizontal canvas ramp sweeping whichever OKLCH
 * channel the active layout assigns to the slider (lightness, chroma, or hue).
 * Lightness and chroma ramps preview the current color's path; the hue ramp
 * uses vivid gamut-boundary colors with smoothed lightness. The marker
 * tracks the channel's position within its range and matches the ramp's color.
 */
import type { Value, View, ViewProps } from '@tweakpane/core'
import { ClassName } from '@tweakpane/core'
import { to as colorJsConvert } from 'colorjs.io/fn'
import type { Channel, PlaneLayout } from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import { channelMax, LAYOUTS, unitToValue, valueToUnit } from '../model/channel.js'
import { computeGlobalMaxChroma, maxChroma, oklchToRgb, widestGamut } from '../model/gamut.js'

const cn = ClassName('hpl')
/** Ramp samples across the strip; the canvas is scaled up by CSS. */
const RAMP_SAMPLES = 256
/** Smooth the cusp's sharp lightness changes over nearby hues. */
const HUE_SMOOTHING_RADIUS = 16
const HUE_SMOOTHING_SIGMA = 6

// The hue strip is independent of the selected color; reuse its raster across
// views and changes instead of repeating the smoothing and gamut searches.
let hueRampImage: ImageData | undefined

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

function clampByte(value: number): number {
	return Math.round(Math.max(0, Math.min(1, value)) * 255)
}

function hueRampColor(hue: number): Record<Channel, number> {
	// Following the fully saturated OKHSV cusp directly produces a sharp drop
	// near blue. Smooth only its lightness, preserving the exact OKLCH hue,
	// then find the available chroma at that lightness instead of clipping RGB.
	let lightness = 0
	let totalWeight = 0
	for (let offset = -HUE_SMOOTHING_RADIUS; offset <= HUE_SMOOTHING_RADIUS; offset += 2) {
		const weight = Math.exp(-0.5 * (offset / HUE_SMOOTHING_SIGMA) ** 2)
		const { coords } = colorJsConvert({ coords: [hue + offset, 1, 1], spaceId: 'okhsv' }, 'oklch')
		lightness += finite(coords[0]) * weight
		totalWeight += weight
	}

	lightness /= totalWeight
	// A little headroom softens transitions where the limiting RGB channel changes.
	return { l: lightness, c: maxChroma(lightness, hue, 'srgb') * 0.98, h: hue }
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
		return { l: finite(l), c: finite(c), h: finite(h) }
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		const target = supportsWideCanvas ? 'p3' : 'srgb'
		const colorSpace: PredefinedColorSpace = supportsWideCanvas ? 'display-p3' : 'srgb'
		const context = this.canvasElement.getContext('2d', { colorSpace })
		const coords = this.oklchCoords()
		const base = this.channel === 'h' ? hueRampColor(coords.h) : coords

		if (context !== null) {
			let ramp = this.channel === 'h' ? hueRampImage : undefined
			if (ramp === undefined) {
				const pixels = new Uint8ClampedArray(RAMP_SAMPLES * 4)
				for (let i = 0; i < RAMP_SAMPLES; i++) {
					const value = unitToValue(this.channel, i / (RAMP_SAMPLES - 1), this.globalMaxChroma)
					const sample =
						this.channel === 'h' ? hueRampColor(value) : { ...base, [this.channel]: value }
					const [r, g, b] = oklchToRgb(sample.l, sample.c, sample.h, target)
					const offset = i * 4
					pixels[offset] = clampByte(r)
					pixels[offset + 1] = clampByte(g)
					pixels[offset + 2] = clampByte(b)
					pixels[offset + 3] = 255
				}

				ramp = new ImageData(pixels, RAMP_SAMPLES, 1, { colorSpace })
				if (this.channel === 'h') {
					hueRampImage = ramp
				}
			}

			context.putImageData(ramp, 0, 0)
		}

		const unit = valueToUnit(this.channel, coords[this.channel], this.globalMaxChroma)
		this.markerElement.style.left = `${unit * 100}%`
		// Written as oklch like the swatch, so the browser paints wide colors itself
		this.markerElement.style.backgroundColor = `oklch(${base.l} ${base.c} ${base.h})`
	}
}
