import {
	ClassName,
	getCanvasContext,
	mapRange,
	type Value,
	type View,
	type ViewProps,
} from '@tweakpane/core'
// Work directly with the colorjs.io library to optimize the per-pixel loop
import { type ColorConstructor, getAll, set } from 'colorjs.io/fn'
import { type ColorPlus } from '../model/color-plus'

const cn = ClassName('svp')

type Config = {
	value: Value<ColorPlus>
	viewProps: ViewProps
}

const canvasResolution = 64

export class SvPaletteView implements View {
	private lastHue = -1
	private readonly markerElement: HTMLDivElement
	public readonly canvasElement: HTMLCanvasElement
	public readonly element: HTMLElement
	public readonly value: Value<ColorPlus>

	constructor(doc: Document, config: Config) {
		this.onValueChange = this.onValueChange.bind(this)

		this.value = config.value
		this.value.emitter.on('change', this.onValueChange)

		this.element = doc.createElement('div')
		this.element.classList.add(cn())
		config.viewProps.bindClassModifiers(this.element)
		config.viewProps.bindTabIndex(this.element)

		const canvasElement = doc.createElement('canvas')
		canvasElement.height = canvasResolution
		canvasElement.width = canvasResolution
		canvasElement.classList.add(cn('c'))
		this.element.append(canvasElement)
		this.canvasElement = canvasElement

		const markerElement = doc.createElement('div')
		markerElement.classList.add(cn('m'))
		this.element.append(markerElement)
		this.markerElement = markerElement

		this.update()
	}

	private onValueChange(): void {
		this.update()
	}

	private update(): void {
		// Draw the reticle
		const [h, s, v] = this.value.rawValue.getAll('hsv')
		const left = mapRange(s ?? 0, 0, 100, 0, 100)
		this.markerElement.style.left = `${left}%`

		const top = mapRange(v ?? 0, 0, 100, 100, 0)
		this.markerElement.style.top = `${top}%`

		// Optimization, only redraw when the hue changes
		if (h !== this.lastHue) {
			const context = getCanvasContext(this.canvasElement)
			if (!context) {
				return
			}

			this.lastHue = h ?? 0
			const c: ColorConstructor = {
				alpha: undefined,
				coords: [this.lastHue, s, v],
				spaceId: 'hsv',
			}

			const { height, width } = this.canvasElement
			const imgData = context.getImageData(0, 0, width, height)
			const { data } = imgData

			// TODO faster way?
			for (let iy = 0; iy < height; iy++) {
				set(c, 'v', mapRange(iy, 0, height, 100, 0))

				for (let ix = 0; ix < width; ix++) {
					set(c, 's', mapRange(ix, 0, width, 0, 100))
					const [r, g, b] = getAll(c, 'srgb')

					const i = (iy * width + ix) * 4
					data[i] = (r ?? 0) * 255
					data[i + 1] = (g ?? 0) * 255
					data[i + 2] = (b ?? 0) * 255
					data[i + 3] = 255
				}
			}

			context.putImageData(imgData, 0, 0)
		}
	}
}
