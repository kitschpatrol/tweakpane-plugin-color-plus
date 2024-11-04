import {
	connectValues,
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	NumberTextController,
	parseNumber,
	Value,
	ValueController,
	ValueMap,
	ViewProps,
} from '@tweakpane/core';
import {ColorType} from '@tweakpane/core/dist/input-binding/color/model/color-model.js';

import {ColorPlus} from '../model/color-plus.js';
import {ColorPickerView} from '../view/color-picker.js';
import {APaletteController} from './a-palette.js';
import {ColorTextsController} from './color-texts.js';
import {HPaletteController} from './h-palette.js';
import {SvPaletteController} from './sv-palette.js';

interface Config {
	colorType: ColorType;
	value: Value<ColorPlus>;
	viewProps: ViewProps;
	supportsAlpha: boolean;
}

/**
 * @hidden
 */
export class ColorPickerController
	implements ValueController<ColorPlus, ColorPickerView>
{
	public readonly value: Value<ColorPlus>;
	public readonly view: ColorPickerView;
	public readonly viewProps: ViewProps;
	private readonly alphaIcs_: {
		palette: APaletteController;
		text: NumberTextController;
	} | null;
	private readonly hPaletteC_: HPaletteController;
	private readonly svPaletteC_: SvPaletteController;
	private readonly textsC_: ColorTextsController;

	constructor(doc: Document, config: Config) {
		this.value = config.value;
		this.viewProps = config.viewProps;

		this.hPaletteC_ = new HPaletteController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		});
		this.svPaletteC_ = new SvPaletteController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		});
		this.alphaIcs_ = config.supportsAlpha
			? {
					palette: new APaletteController(doc, {
						value: this.value,
						viewProps: this.viewProps,
					}),
					text: new NumberTextController(doc, {
						parser: parseNumber,
						props: ValueMap.fromObject({
							pointerScale: 0.01,
							keyScale: 0.1,
							formatter: createNumberFormatter(2),
						}),
						value: createValue(0, {
							constraint: new DefiniteRangeConstraint({min: 0, max: 1}),
						}),
						viewProps: this.viewProps,
					}),
				}
			: null;
		if (this.alphaIcs_) {
			connectValues({
				primary: this.value,
				secondary: this.alphaIcs_.text.value,
				// TODO vet this
				forward: (p) => p.alpha,
				// TODO vet this
				backward: (p, s) => {
					p.alpha = s;
					return p.clone();
				},
			});
		}

		this.textsC_ = new ColorTextsController(doc, {
			colorType: config.colorType,
			value: this.value,
			viewProps: this.viewProps,
		});

		this.view = new ColorPickerView(doc, {
			alphaViews: this.alphaIcs_
				? {
						palette: this.alphaIcs_.palette.view,
						text: this.alphaIcs_.text.view,
					}
				: null,
			hPaletteView: this.hPaletteC_.view,
			supportsAlpha: config.supportsAlpha,
			svPaletteView: this.svPaletteC_.view,
			textsView: this.textsC_.view,
			viewProps: this.viewProps,
		});
	}

	get textsController(): ColorTextsController {
		return this.textsC_;
	}
}
