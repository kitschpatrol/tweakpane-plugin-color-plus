import type { Value, ValueController, ViewProps } from '@tweakpane/core'
import type { ColorPlus } from '../model/color-plus'
import type { GamutMethod } from '../model/shared'
import { ColorSwatchView } from '../view/color-swatch'

type Config = {
	swatchFallback: GamutMethod
	value: Value<ColorPlus>
	viewProps: ViewProps
}

export class ColorSwatchController implements ValueController<ColorPlus, ColorSwatchView> {
	public readonly value: Value<ColorPlus>
	public readonly view: ColorSwatchView
	public readonly viewProps: ViewProps

	constructor(doc: Document, config: Config) {
		this.value = config.value
		this.viewProps = config.viewProps

		this.view = new ColorSwatchView(doc, {
			swatchFallback: config.swatchFallback,
			value: this.value,
			viewProps: this.viewProps,
		})
	}
}
