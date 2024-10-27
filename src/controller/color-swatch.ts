import {Value, ValueController, ViewProps} from '@tweakpane/core';

import {ColorValueInternal} from '../plugin.js';
import {ColorSwatchView} from '../view/color-swatch.js';

interface Config {
	value: Value<ColorValueInternal>;
	viewProps: ViewProps;
}

/**
 * @hidden
 */
export class ColorSwatchController
	implements ValueController<ColorValueInternal, ColorSwatchView>
{
	public readonly value: Value<ColorValueInternal>;
	public readonly view: ColorSwatchView;
	public readonly viewProps: ViewProps;

	constructor(doc: Document, config: Config) {
		this.value = config.value;
		this.viewProps = config.viewProps;

		this.view = new ColorSwatchView(doc, {
			value: this.value,
			viewProps: this.viewProps,
		});
	}
}
