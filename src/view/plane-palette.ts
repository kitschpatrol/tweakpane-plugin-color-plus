/*
 * Generalized OKLCH picker plane. Two of the three OKLCH channels run along the
 * screen axes while the third is fixed by the off-plane slider; which channel
 * goes where is set by `paletteChannels` (see ../model/channel). A canvas gradient shows
 * the in-gamut colors, the configured gamut boundaries are stroked over it, and
 * a draggable marker tracks the current color.
 *
 * Every layout reduces to one primitive: at a fixed iteration-axis value, the
 * in-gamut extent along the band axis is a single contiguous interval — chroma
 * (anchored at the achromatic axis) or, when chroma is the slider, lightness.
 * Perceptual mode paints absolute positions and clips to that band so the
 * frontier is a crisp vector edge; stretch mode normalizes the band to fill the
 * plane. Hue is never the band axis (its in-gamut slice can be several arcs).
 *
 * The per-column gamut scan follows the approach in Evil Martians' oklch-picker
 * (https://github.com/evilmartians/oklch-picker, MIT), re-expressed through
 * colorjs.io via ../model/gamut.
 */
import type { Value, View, ViewProps } from '@tweakpane/core'
import { ClassName } from '@tweakpane/core'
import type {
	Channel,
	LayoutRoles,
	PaletteProjection,
	PlaneBand,
	PlaneLayout,
} from '../model/channel.js'
import type { ColorPlus } from '../model/color-plus.js'
import type { OkhsvProfile } from '../model/okhsv.js'
import {
	axisFractionToUnit,
	LAYOUTS,
	planeBand,
	positionToOklch,
	unitToAxisFraction,
	unitToValue,
	valueToUnit,
} from '../model/channel.js'
import {
	computeGlobalMaxChroma,
	GAMUT_LABELS,
	gamutsByExtent,
	lightnessRange,
	maxChroma,
	minimumGamut,
	oklchToRgb,
	widestGamut,
} from '../model/gamut.js'
import {
	buildOkhsvProfile,
	lightnessChromaToOkhsv,
	okhsvToLightnessChroma,
} from '../model/okhsv.js'

const cn = ClassName('plp')
// Reuse Tweakpane's native SV-palette classes so the canvas + marker inherit
// the built-in sizing, crosshair cursor, and marker styling.
const svp = ClassName('svp')

/** Gradient is rasterized at 1/4 of the backing resolution, then scaled up. */
const SUBSAMPLE = 4
/** Iteration-axis samples for band curves, the clip path, and boundary strokes. */
const BAND_STEPS = 64

type IterSample = {
	band: [number, number] | undefined
	iterValue: number
}

/** One in-gamut band sample along the iteration axis, used to trace boundaries. */
type BandSample = {
	band: [number, number]
	iterValue: number
	widest: [number, number] | undefined
}

type Point = {
	x: number
	y: number
}

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

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

/**
 * Which configured gamut boundaries are stroked over the plane: 'inner' draws
 * the narrower gamuts' lines, 'outer' draws the widest gamut's (otherwise
 * redundant with the drawn plane's own edge), 'all' draws both, and 'none'
 * hides every line.
 */
export type GamutLines = 'all' | 'inner' | 'none' | 'outer'

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

export class PlanePaletteView implements View {
	public readonly canvasElement: HTMLCanvasElement
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>
	public readonly widestGamutId: string
	private readonly band: PlaneBand
	private readonly boundaryGamutIds: string[]
	private readonly constrain: boolean
	private readonly gamutIds: string[]
	private readonly globalMaxChroma: number
	private readonly innerBoundary: boolean
	private iterSamples: IterSample[] = []
	private readonly labelElement: HTMLDivElement | undefined
	// Last stretch band fraction (0..1 across the band axis) the user picked. At a
	// pole the band collapses to a point, so the achromatic color can't say where
	// along that axis the marker sits; this keeps it sliding along the top/bottom
	// edge instead of snapping to the achromatic corner.
	private lastBandUnit = 0
	// Last okhsv saturation the user picked. At value 0 the color is black for
	// every saturation, so it can't be recovered from the color; this keeps the
	// marker sliding along the black edge instead of snapping to the corner.
	private lastOkhsvSaturation = 0
	private lastPaintedSlider = Number.NaN
	private readonly markerElement: HTMLDivElement
	private offscreenCanvas: HTMLCanvasElement | undefined
	private offscreenHeight = 0
	private offscreenWidth = 0
	private readonly outerBoundary: boolean
	private rafHandle: number | undefined
	private readonly resizeObserver: ResizeObserver | undefined
	private readonly roles: LayoutRoles
	private readonly sliderChannel: Channel
	private readonly stretch: boolean
	private readonly useOkhsv: boolean

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		this.value = config.value
		this.stretch = config.paletteProjection !== 'perceptual'
		this.constrain = config.constrain
		this.outerBoundary = config.gamutLines === 'outer' || config.gamutLines === 'all'
		this.innerBoundary = config.gamutLines === 'inner' || config.gamutLines === 'all'
		this.roles = LAYOUTS[config.paletteChannels]
		this.band = planeBand(this.roles)
		this.sliderChannel = this.roles.slider
		// The OKHSV projection applies only to the lightness×chroma layouts (hue
		// on the slider); the others keep per-row band normalization.
		this.useOkhsv =
			config.paletteProjection === 'okhsv' &&
			this.band.bandChannel === 'c' &&
			this.band.iterChannel === 'l'
		this.gamutIds = config.gamuts
		this.boundaryGamutIds = gamutsByExtent(config.gamuts)
		this.widestGamutId = widestGamut(config.gamuts)
		this.globalMaxChroma = computeGlobalMaxChroma(this.widestGamutId)

		this.value.emitter.on('change', this.onValueChange)

		this.element = doc.createElement('div')
		// Reuse the native SV-palette container styling (rounded, clipped, relative).
		this.element.classList.add(cn(), svp())
		// In perceptual mode the out-of-gamut region is left transparent, so the
		// container shows through; tint it to match a text input's background.
		if (!this.stretch) {
			this.element.classList.add(cn(undefined, 'perceptual'))
		}

		config.viewProps.bindClassModifiers(this.element)
		config.viewProps.bindTabIndex(this.element)

		const canvasElement = doc.createElement('canvas')
		canvasElement.classList.add(cn('c'), svp('c'))
		this.element.append(canvasElement)
		this.canvasElement = canvasElement

		// Appended before the marker so the marker (reticle) paints over the label.
		if (config.gamutLabel) {
			const labelElement = doc.createElement('div')
			labelElement.classList.add(cn('label'))
			this.element.append(labelElement)
			this.labelElement = labelElement
			this.updateLabel()
		}

		const markerElement = doc.createElement('div')
		markerElement.classList.add(cn('m'), svp('m'))
		this.element.append(markerElement)
		this.markerElement = markerElement

		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() => {
				this.lastPaintedSlider = Number.NaN
				this.schedulePaint()
			})
			this.resizeObserver.observe(canvasElement)
		}

		config.viewProps.handleDispose(() => {
			this.value.emitter.off('change', this.onValueChange)
			this.resizeObserver?.disconnect()
			if (this.rafHandle !== undefined) {
				cancelAnimationFrame(this.rafHandle)
				this.rafHandle = undefined
			}
		})

		this.schedulePaint()
		this.positionMarker()
	}

	/** The marker's normalized plane position for the current color. */
	public markerPosition(): Point {
		if (this.useOkhsv) {
			const coords = this.oklchCoords()
			const [s, v] = lightnessChromaToOkhsv(
				this.okhsvProfileFor(this.currentSlider()),
				coords.l,
				coords.c,
			)
			// Black (value 0) is saturation-agnostic, so reuse the last picked
			// saturation rather than collapsing the marker to the achromatic corner.
			const saturation = v <= 1e-6 ? this.lastOkhsvSaturation : s
			return this.okhsvPosition(saturation, v)
		}

		const coords = this.oklchCoords()
		const iterValue = coords[this.band.iterChannel]
		const bandValue = coords[this.band.bandChannel]
		const iterFraction = unitToAxisFraction(
			valueToUnit(this.band.iterChannel, iterValue, this.globalMaxChroma),
			this.band.iterAxis,
		)
		const widest = this.stretch ? this.widestBandAt(iterFraction) : undefined
		// At a pole the stretch band collapses to a point, so the achromatic color
		// can't tell us where along the band axis the marker sits — reconstructing
		// from it would snap to the achromatic corner. Reuse the last picked band
		// fraction so the marker slides along the top/bottom edge instead, the
		// stretch analogue of the OKHSV lastOkhsvSaturation carry above.
		if (this.stretch && widest !== undefined && widest[1] - widest[0] <= 1e-9) {
			const bandFraction = unitToAxisFraction(this.lastBandUnit, this.band.bandAxis)
			return this.band.bandAxis === 'x'
				? { x: bandFraction, y: iterFraction }
				: { x: iterFraction, y: bandFraction }
		}

		return this.positionFor(iterValue, bandValue, widest)
	}

	/** Map a normalized pointer position to an in-gamut OKLCH color. */
	public resolvePointer(xFraction: number, yFraction: number): Record<Channel, number> {
		const xf = clamp01(xFraction)
		const yf = clamp01(yFraction)
		const gmax = this.globalMaxChroma
		const slider = this.currentSlider()

		if (this.useOkhsv) {
			const value = axisFractionToUnit(this.band.iterAxis === 'x' ? xf : yf, this.band.iterAxis)
			const sat = axisFractionToUnit(this.band.bandAxis === 'x' ? xf : yf, this.band.bandAxis)
			this.lastOkhsvSaturation = sat
			const [l, c] = okhsvToLightnessChroma(this.okhsvProfileFor(slider), sat, value)
			// The OKHSV boundary is a piecewise-linear sample of maxChroma, so its top
			// edge (value 1) can sit a rounding step past the true gamut; clamp chroma
			// to the in-gamut maximum so a pick never lands out of gamut.
			return { c: Math.min(c, maxChroma(l, slider, this.widestGamutId, gmax)), h: slider, l }
		}

		if (this.stretch) {
			const iterFraction = this.band.iterAxis === 'x' ? xf : yf
			const bandFraction = this.band.bandAxis === 'x' ? xf : yf
			const iterValue = unitToValue(
				this.band.iterChannel,
				axisFractionToUnit(iterFraction, this.band.iterAxis),
				gmax,
			)
			// Resolve against the same per-column interpolated band the gradient and
			// marker use (not the exact band), so a pick lands on the color shown under
			// the cursor and the marker tracks the pointer instead of drifting near the
			// poles, where maxChroma changes fastest between samples.
			const widest = this.widestBandAt(iterFraction)
			// Remember the band fraction so the marker can recover its position when the
			// band collapses at a pole (the resulting achromatic color forgets the x).
			const unit = axisFractionToUnit(bandFraction, this.band.bandAxis)
			this.lastBandUnit = unit
			let bandValue = widest === undefined ? 0 : widest[0] + unit * (widest[1] - widest[0])
			// The interpolated band can overshoot the true frontier between grid
			// samples by a rounding step, so a pick on the plane's edge would land
			// (barely) out of gamut; clip it into the exact band (mirrors the OKHSV
			// pick above).
			const exact = this.bandFor(iterValue, this.widestGamutId, slider)
			if (exact !== undefined) {
				bandValue = Math.max(exact[0], Math.min(exact[1], bandValue))
			}

			const coords: Record<Channel, number> = {
				c: 0,
				h: 0,
				l: 0,
				[this.band.bandChannel]: bandValue,
				[this.band.iterChannel]: iterValue,
				[this.sliderChannel]: slider,
			}
			return coords
		}

		const [l, c, h] = positionToOklch(this.roles, xf, yf, slider, gmax)
		const coords: Record<Channel, number> = { c, h, l }
		// When gamut constraining is off, let the position map straight to its
		// (possibly out-of-gamut) color instead of snapping back onto the gamut
		// frontier.
		if (!this.constrain) {
			return coords
		}

		const band = this.widestBandFor(coords[this.band.iterChannel])
		const bandValue = coords[this.band.bandChannel]
		if (band !== undefined && bandValue >= band[0] - 1e-6 && bandValue <= band[1] + 1e-6) {
			return coords
		}

		return this.projectToBoundary(xf, yf, slider)
	}

	private bandFor(
		iterValue: number,
		gamutId: string,
		sliderValue: number,
	): [number, number] | undefined {
		const coords: Record<Channel, number> = {
			c: 0,
			h: 0,
			l: 0,
			[this.band.iterChannel]: iterValue,
			[this.sliderChannel]: sliderValue,
		}
		if (this.band.bandChannel === 'c') {
			// The achromatic axis (chroma 0) is inside every RGB gamut for any lightness
			// in [0, 1], so the chroma band always exists — at the black/white poles it
			// just collapses to the single point [0, 0]. Returning that rather than
			// undefined keeps those columns painted (not transparent) and the marker
			// positioned there instead of snapping to the achromatic edge.
			const c = maxChroma(coords.l, coords.h, gamutId, this.globalMaxChroma)
			return [0, c]
		}

		return lightnessRange(coords.c, coords.h, gamutId)
	}

	/**
	 * Trace the in-gamut band along the iteration axis as one or more contiguous
	 * runs. Each run's ends are bisected onto the true frontier where the band
	 * collapses, so a contour tapers to a point instead of stopping a whole grid
	 * step short. Reuses the precomputed widest-gamut band at grid steps for
	 * stretch normalization and recomputes it only at the refined endpoints.
	 */
	private buildBandRuns(gamutId: string, sliderValue: number): BandSample[][] {
		const iterAt = (step: number): number =>
			unitToValue(
				this.band.iterChannel,
				axisFractionToUnit(step / BAND_STEPS, this.band.iterAxis),
				this.globalMaxChroma,
			)
		const sampleAt = (iterValue: number): BandSample | undefined => {
			const band = this.bandFor(iterValue, gamutId, sliderValue)
			if (band === undefined) {
				return undefined
			}

			return {
				band,
				iterValue,
				widest: this.stretch ? this.bandFor(iterValue, this.widestGamutId, sliderValue) : undefined,
			}
		}

		const refine = (insideIter: number, outsideIter: number): BandSample | undefined => {
			let inside = insideIter
			let outside = outsideIter
			let edge: BandSample | undefined
			for (let i = 0; i < 12; i++) {
				const mid = (inside + outside) / 2
				const sample = sampleAt(mid)
				if (sample === undefined) {
					outside = mid
				} else {
					inside = mid
					edge = sample
				}
			}

			return edge
		}

		const runs: BandSample[][] = []
		let run: BandSample[] = []
		let previousIter: number | undefined
		let wasInside = false
		for (let step = 0; step <= BAND_STEPS; step++) {
			const iterValue = iterAt(step)
			const band = this.bandFor(iterValue, gamutId, sliderValue)
			const sample: BandSample | undefined =
				band === undefined
					? undefined
					: { band, iterValue, widest: this.stretch ? this.iterSamples[step]?.band : undefined }

			if (sample === undefined) {
				if (wasInside && previousIter !== undefined) {
					const edge = refine(previousIter, iterValue)
					if (edge !== undefined) {
						run.push(edge)
					}

					runs.push(run)
					run = []
				}
			} else {
				if (!wasInside && previousIter !== undefined) {
					const edge = refine(iterValue, previousIter)
					if (edge !== undefined) {
						run.push(edge)
					}
				}

				run.push(sample)
			}

			previousIter = iterValue
			wasInside = sample !== undefined
		}

		if (run.length > 0) {
			runs.push(run)
		}

		return runs
	}

	private clipToGamut(context: CanvasRenderingContext2D, width: number, height: number): void {
		const samples = this.iterSamples
		context.beginPath()

		const flushRun = (start: number, end: number): void => {
			for (let s = start; s <= end; s++) {
				const sample = samples[s]
				if (sample.band === undefined) {
					continue
				}

				const point = this.positionFor(sample.iterValue, sample.band[1])
				if (s === start) {
					context.moveTo(point.x * width, point.y * height)
				} else {
					context.lineTo(point.x * width, point.y * height)
				}
			}

			for (let s = end; s >= start; s--) {
				const sample = samples[s]
				if (sample.band === undefined) {
					continue
				}

				const point = this.positionFor(sample.iterValue, sample.band[0])
				context.lineTo(point.x * width, point.y * height)
			}

			context.closePath()
		}

		let runStart = -1
		for (const [s, sample] of samples.entries()) {
			if (sample.band === undefined) {
				if (runStart >= 0) {
					flushRun(runStart, s - 1)
					runStart = -1
				}
			} else if (runStart < 0) {
				runStart = s
			}
		}

		if (runStart >= 0) {
			flushRun(runStart, samples.length - 1)
		}

		context.clip()
	}

	private computeIterSamples(sliderValue: number): IterSample[] {
		const samples: IterSample[] = []
		for (let s = 0; s <= BAND_STEPS; s++) {
			const iterValue = unitToValue(
				this.band.iterChannel,
				axisFractionToUnit(s / BAND_STEPS, this.band.iterAxis),
				this.globalMaxChroma,
			)
			samples.push({ band: this.bandFor(iterValue, this.widestGamutId, sliderValue), iterValue })
		}

		return samples
	}

	private currentSlider(): number {
		return this.oklchCoords()[this.sliderChannel]
	}

	private ensureOffscreen(
		width: number,
		height: number,
		colorSpace: PredefinedColorSpace,
	): CanvasRenderingContext2D | undefined {
		if (
			this.offscreenCanvas === undefined ||
			this.offscreenWidth !== width ||
			this.offscreenHeight !== height
		) {
			this.offscreenCanvas ??= document.createElement('canvas')
			this.offscreenCanvas.width = width
			this.offscreenCanvas.height = height
			this.offscreenWidth = width
			this.offscreenHeight = height
		}

		return this.offscreenCanvas.getContext('2d', { colorSpace }) ?? undefined
	}

	/**
	 * Push an endpoint slightly past the plane border, along the line's tangent,
	 * when it sits on the border. The clip then trims the line's blunt end cap
	 * off-plane so the boundary appears to run cleanly off the edge.
	 */
	private nudgePastBorder(
		point: Point,
		neighbor: Point,
		width: number,
		height: number,
		overshoot: number,
	): void {
		const onBorder =
			point.x <= 0.5 || point.x >= width - 0.5 || point.y <= 0.5 || point.y >= height - 0.5
		if (!onBorder) {
			return
		}

		const dx = point.x - neighbor.x
		const dy = point.y - neighbor.y
		const length = Math.hypot(dx, dy)
		if (length < 1e-6) {
			return
		}

		point.x += (dx / length) * overshoot
		point.y += (dy / length) * overshoot
	}

	private okhsvPixel(xFraction: number, yFraction: number, hue: number): [number, number, number] {
		const value = axisFractionToUnit(
			this.band.iterAxis === 'x' ? xFraction : yFraction,
			this.band.iterAxis,
		)
		const sat = axisFractionToUnit(
			this.band.bandAxis === 'x' ? xFraction : yFraction,
			this.band.bandAxis,
		)
		const [l, c] = okhsvToLightnessChroma(this.okhsvProfileFor(hue), sat, value)
		return [l, c, hue]
	}

	private okhsvPosition(saturation: number, value: number): Point {
		const valueFraction = unitToAxisFraction(value, this.band.iterAxis)
		const satFraction = unitToAxisFraction(saturation, this.band.bandAxis)
		return this.band.bandAxis === 'x'
			? { x: satFraction, y: valueFraction }
			: { x: valueFraction, y: satFraction }
	}

	// Cheap to call repeatedly: buildOkhsvProfile memoizes per hue and gamut
	private okhsvProfileFor(hue: number): OkhsvProfile {
		return buildOkhsvProfile(hue, this.widestGamutId)
	}

	private oklchCoords(): Record<Channel, number> {
		const [l, c, h] = this.value.rawValue.getAll('oklch')
		return { c: finite(c), h: finite(h), l: finite(l) }
	}

	private onValueChange(): void {
		this.positionMarker()
		this.updateLabel()
		if (this.currentSlider() !== this.lastPaintedSlider) {
			this.schedulePaint()
		}
	}

	private paint(): void {
		const canvas = this.canvasElement
		const sliderValue = this.currentSlider()
		this.lastPaintedSlider = sliderValue

		const dpr = window.devicePixelRatio || 1
		const cssWidth = canvas.clientWidth || 200
		const cssHeight = canvas.clientHeight || 150
		const backingWidth = Math.round(cssWidth * dpr)
		const backingHeight = Math.round(cssHeight * dpr)
		const width = Math.max(1, Math.round(backingWidth / SUBSAMPLE))
		const height = Math.max(1, Math.round(backingHeight / SUBSAMPLE))
		const target = supportsWideCanvas ? 'p3' : 'srgb'
		const colorSpace: PredefinedColorSpace = supportsWideCanvas ? 'display-p3' : 'srgb'

		if (!this.useOkhsv) {
			this.iterSamples = this.computeIterSamples(sliderValue)
		}

		const pixels = this.renderGradient(width, height, sliderValue, target)

		const offscreenContext = this.ensureOffscreen(width, height, colorSpace)
		if (offscreenContext === undefined) {
			return
		}

		offscreenContext.putImageData(new ImageData(pixels, width, height, { colorSpace }), 0, 0)

		canvas.width = backingWidth
		canvas.height = backingHeight
		const context = canvas.getContext('2d', { colorSpace })
		if (context === null || this.offscreenCanvas === undefined) {
			return
		}

		context.imageSmoothingEnabled = true
		if (this.stretch) {
			context.drawImage(this.offscreenCanvas, 0, 0, backingWidth, backingHeight)
		} else {
			// Perceptual mode: reveal the gradient only inside the widest gamut, using
			// a vector clip so the frontier is a smooth antialiased curve.
			context.save()
			this.clipToGamut(context, backingWidth, backingHeight)
			context.drawImage(this.offscreenCanvas, 0, 0, backingWidth, backingHeight)
			context.restore()
		}

		for (const gamutId of this.boundaryGamutIds) {
			// The widest gamut already reads as the edge of the drawn plane, so its
			// line ('outer') is redundant by default and drawn only on request; the
			// narrower gamuts' lines ('inner') are on by default.
			const isDrawn = gamutId === this.widestGamutId ? this.outerBoundary : this.innerBoundary
			if (!isDrawn) {
				continue
			}

			if (this.useOkhsv) {
				this.strokeBoundaryOkhsv(
					context,
					gamutId,
					backingWidth,
					backingHeight,
					dpr,
					sliderValue,
					this.okhsvProfileFor(sliderValue),
				)
			} else {
				this.strokeBoundary(context, gamutId, backingWidth, backingHeight, dpr, sliderValue)
			}
		}

		this.positionMarker()
	}

	private pixelColor(
		xFraction: number,
		yFraction: number,
		sliderValue: number,
		band: [number, number] | undefined,
	): [number, number, number] | undefined {
		if (this.useOkhsv) {
			return this.okhsvPixel(xFraction, yFraction, sliderValue)
		}

		if (this.stretch) {
			return this.stretchPixel(xFraction, yFraction, band, sliderValue)
		}

		return positionToOklch(this.roles, xFraction, yFraction, sliderValue, this.globalMaxChroma)
	}

	private positionFor(iterValue: number, bandValue: number, widestBand?: [number, number]): Point {
		const iterFraction = unitToAxisFraction(
			valueToUnit(this.band.iterChannel, iterValue, this.globalMaxChroma),
			this.band.iterAxis,
		)

		let bandUnit: number
		if (this.stretch) {
			if (widestBand !== undefined && widestBand[1] > widestBand[0]) {
				bandUnit = clamp01((bandValue - widestBand[0]) / (widestBand[1] - widestBand[0]))
			} else if (this.band.bandChannel === 'c') {
				// At the black/white poles the widest gamut's chroma band collapses to
				// the achromatic point, which every gamut contains — so nothing in the
				// column is outside any boundary. Pin boundary points to the band's far
				// edge so the strokes run into the plane's top corners, instead of
				// plunging down the side to the achromatic axis (which read as
				// black/white being out of gamut).
				bandUnit = 1
			} else {
				bandUnit = 0
			}
		} else {
			bandUnit = valueToUnit(this.band.bandChannel, bandValue, this.globalMaxChroma)
		}

		const bandFraction = unitToAxisFraction(bandUnit, this.band.bandAxis)
		return this.band.bandAxis === 'x'
			? { x: bandFraction, y: iterFraction }
			: { x: iterFraction, y: bandFraction }
	}

	private positionMarker(): void {
		const { x, y } = this.markerPosition()
		this.markerElement.style.left = `${x * 100}%`
		this.markerElement.style.top = `${y * 100}%`
	}

	private projectToBoundary(
		xFraction: number,
		yFraction: number,
		sliderValue: number,
	): Record<Channel, number> {
		const width = this.canvasElement.clientWidth || 1
		const height = this.canvasElement.clientHeight || 1
		const px = xFraction * width
		const py = yFraction * height

		let bestIter = 0
		let bestBand = 0
		let bestDistance = Number.POSITIVE_INFINITY
		const consider = (iterValue: number, bandValue: number): void => {
			const point = this.positionFor(iterValue, bandValue)
			const dx = point.x * width - px
			const dy = point.y * height - py
			const distance = dx * dx + dy * dy
			if (distance < bestDistance) {
				bestDistance = distance
				bestIter = iterValue
				bestBand = bandValue
			}
		}

		for (let s = 0; s <= BAND_STEPS; s++) {
			const iterValue = unitToValue(
				this.band.iterChannel,
				axisFractionToUnit(s / BAND_STEPS, this.band.iterAxis),
				this.globalMaxChroma,
			)
			const band = this.bandFor(iterValue, this.widestGamutId, sliderValue)
			if (band === undefined) {
				continue
			}

			consider(iterValue, band[1])
			if (this.band.bandChannel === 'l') {
				consider(iterValue, band[0])
			}
		}

		const coords: Record<Channel, number> = {
			c: 0,
			h: 0,
			l: 0,
			[this.band.bandChannel]: bestBand,
			[this.band.iterChannel]: bestIter,
			[this.sliderChannel]: sliderValue,
		}
		return coords
	}

	private renderGradient(
		width: number,
		height: number,
		sliderValue: number,
		target: string,
	): Uint8ClampedArray<ArrayBuffer> {
		const iterCount = this.band.iterAxis === 'x' ? width : height
		const bandByIter: Array<[number, number] | undefined> = []
		if (this.stretch && !this.useOkhsv) {
			for (let p = 0; p < iterCount; p++) {
				bandByIter.push(this.widestBandAt(iterCount > 1 ? p / (iterCount - 1) : 0))
			}
		}

		const pixels = new Uint8ClampedArray(width * height * 4)
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const offset = (y * width + x) * 4
				const xFraction = width > 1 ? x / (width - 1) : 0
				const yFraction = height > 1 ? y / (height - 1) : 0
				const band = bandByIter[this.band.iterAxis === 'x' ? x : y]
				const coords = this.pixelColor(xFraction, yFraction, sliderValue, band)
				if (coords === undefined) {
					pixels[offset + 3] = 0
					continue
				}

				const [r, g, b] = oklchToRgb(coords[0], coords[1], coords[2], target)
				pixels[offset] = clampByte(r)
				pixels[offset + 1] = clampByte(g)
				pixels[offset + 2] = clampByte(b)
				pixels[offset + 3] = 255
			}
		}

		return pixels
	}

	private schedulePaint(): void {
		if (this.rafHandle !== undefined) {
			return
		}

		this.rafHandle = requestAnimationFrame(() => {
			this.rafHandle = undefined
			this.paint()
		})
	}

	private stretchPixel(
		xFraction: number,
		yFraction: number,
		band: [number, number] | undefined,
		sliderValue: number,
	): [number, number, number] | undefined {
		if (band === undefined) {
			return undefined
		}

		const iterFraction = this.band.iterAxis === 'x' ? xFraction : yFraction
		const bandFraction = this.band.bandAxis === 'x' ? xFraction : yFraction
		const iterValue = unitToValue(
			this.band.iterChannel,
			axisFractionToUnit(iterFraction, this.band.iterAxis),
			this.globalMaxChroma,
		)
		const bandUnit = axisFractionToUnit(bandFraction, this.band.bandAxis)
		const pixel: Record<Channel, number> = {
			c: 0,
			h: 0,
			l: 0,
			[this.band.bandChannel]: band[0] + bandUnit * (band[1] - band[0]),
			[this.band.iterChannel]: iterValue,
			[this.sliderChannel]: sliderValue,
		}
		return [pixel.l, pixel.c, pixel.h]
	}

	private strokeBoundary(
		context: CanvasRenderingContext2D,
		gamutId: string,
		width: number,
		height: number,
		dpr: number,
		sliderValue: number,
	): void {
		// A lightness band is bounded on both sides: trace the hi edge out and the
		// lo edge back as one open polyline, so it turns around smoothly at an
		// interior pinch (no closing chord cutting across the plane) and runs off
		// the edges. A chroma band is anchored at the achromatic axis, so only its
		// hi edge is a real frontier.
		const isClosed = this.band.bandChannel === 'l'
		const runs = this.buildBandRuns(gamutId, sliderValue)
		const toPixel = (
			iterValue: number,
			bandValue: number,
			widest: [number, number] | undefined,
		): Point => {
			const point = this.positionFor(iterValue, bandValue, widest)
			return { x: point.x * width, y: point.y * height }
		}

		context.save()
		// Clip to the plane so a boundary that meets an edge stops cleanly there
		// rather than bulging past it under the stroke width.
		context.beginPath()
		context.rect(0, 0, width, height)
		context.clip()
		context.strokeStyle = 'rgba(128, 128, 128, 0.8)'
		context.lineWidth = dpr
		context.lineCap = 'butt'
		context.lineJoin = 'round'

		for (const run of runs) {
			const forward: Point[] = []
			const back: Point[] = []
			for (const sample of run) {
				forward.push(toPixel(sample.iterValue, sample.band[1], sample.widest))
				if (isClosed) {
					// Prepend so the return leg reads right-to-left when appended.
					back.unshift(toPixel(sample.iterValue, sample.band[0], sample.widest))
				}
			}

			// When a closed band's run ends at the plane border (e.g. hue wrapping
			// off the right edge) rather than at an interior pinch, joining the two
			// edges would draw the hi→lo connecting chord down that border, leaving
			// a sliver inside the clip. Stroke the edges separately so each endpoint
			// is nudged past the border and trimmed instead.
			const junction = forward.at(-1)
			const junctionOnBorder =
				isClosed &&
				junction !== undefined &&
				(junction.x <= 0.5 ||
					junction.x >= width - 0.5 ||
					junction.y <= 0.5 ||
					junction.y >= height - 0.5)
			if (junctionOnBorder) {
				this.strokePolyline(context, forward, width, height, dpr * 2)
				this.strokePolyline(context, back, width, height, dpr * 2)
			} else {
				this.strokePolyline(context, [...forward, ...back], width, height, dpr * 2)
			}
		}

		context.restore()
	}

	private strokeBoundaryOkhsv(
		context: CanvasRenderingContext2D,
		gamutId: string,
		width: number,
		height: number,
		dpr: number,
		hue: number,
		profile: OkhsvProfile,
	): void {
		const sv: Array<[number, number]> = []
		for (let s = 0; s <= BAND_STEPS; s++) {
			const l = s / BAND_STEPS
			sv.push(lightnessChromaToOkhsv(profile, l, maxChroma(l, hue, gamutId)))
		}

		// The black vertex (lightness 0) has zero chroma, so its OKHSV saturation
		// collapses to 0 — but the gamut boundary approaches black along a fixed,
		// nonzero slope. Carry the next sample's saturation into it so the line
		// drops straight to the black edge instead of cutting across it to the
		// achromatic corner (a phantom boundary along the plane's dark edge). The
		// loop above always emits BAND_STEPS + 1 samples, so both ends exist.
		const blackVertex = sv[0]
		const nextSample = sv[1]
		if (blackVertex[1] <= 1e-6) {
			blackVertex[0] = nextSample[0]
		}

		const points = sv.map(([saturation, value]) => {
			const point = this.okhsvPosition(saturation, value)
			return { x: point.x * width, y: point.y * height }
		})

		context.save()
		// Clip to the plane so the boundary meets the edges cleanly.
		context.beginPath()
		context.rect(0, 0, width, height)
		context.clip()
		context.strokeStyle = 'rgba(128, 128, 128, 0.8)'
		context.lineWidth = dpr
		context.lineCap = 'butt'
		context.lineJoin = 'round'
		this.strokePolyline(context, points, width, height, dpr * 2)
		context.restore()
	}

	/**
	 * Stroke an open polyline of plane-pixel points, extending border-touching
	 * endpoints past the clip so their caps are trimmed rather than left
	 * visible.
	 */
	private strokePolyline(
		context: CanvasRenderingContext2D,
		points: Point[],
		width: number,
		height: number,
		overshoot: number,
	): void {
		// Capture the two ends without indexing (the type checker and linter
		// disagree on whether indexed access can be undefined).
		let first: Point | undefined
		let second: Point | undefined
		let last: Point | undefined
		let penultimate: Point | undefined
		let count = 0
		for (const point of points) {
			if (count === 0) {
				first = point
			} else if (count === 1) {
				second = point
			}

			penultimate = last
			last = point
			count++
		}

		if (count < 2) {
			return
		}

		if (first !== undefined && second !== undefined) {
			this.nudgePastBorder(first, second, width, height, overshoot)
		}

		if (last !== undefined && penultimate !== undefined) {
			this.nudgePastBorder(last, penultimate, width, height, overshoot)
		}

		context.beginPath()
		for (const [index, point] of points.entries()) {
			if (index === 0) {
				context.moveTo(point.x, point.y)
			} else {
				context.lineTo(point.x, point.y)
			}
		}

		context.stroke()
	}

	/** Show the narrowest configured gamut that holds the current color. */
	private updateLabel(): void {
		if (this.labelElement === undefined) {
			return
		}

		const { c, h, l } = this.oklchCoords()
		const id = minimumGamut(l, c, h, this.gamutIds)
		this.labelElement.textContent = id === undefined ? 'Out of gamut' : (GAMUT_LABELS[id] ?? id)
	}

	private widestBandAt(iterFraction: number): [number, number] | undefined {
		const samples = this.iterSamples
		if (samples.length === 0) {
			return undefined
		}

		const pos = clamp01(iterFraction) * (samples.length - 1)
		const i = Math.floor(pos)
		const j = Math.min(i + 1, samples.length - 1)
		const frac = pos - i
		const a = samples[i].band
		const b = samples[j].band
		if (a === undefined || b === undefined) {
			return undefined
		}

		return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]
	}

	private widestBandFor(iterValue: number): [number, number] | undefined {
		return this.bandFor(iterValue, this.widestGamutId, this.currentSlider())
	}
}
