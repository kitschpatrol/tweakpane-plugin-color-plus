import {
	connectValues,
	Constraint,
	createNumberFormatter,
	createValue,
	DefiniteRangeConstraint,
	Formatter,
	InputView,
	NumberTextController,
	parseNumber,
	Parser,
	TextController,
	Value,
	ValueController,
	ValueMap,
	ViewProps,
} from '@tweakpane/core';

import {
	ColorPlus,
	type ColorType,
	getRangeForChannel,
} from '../model/color-plus.js';
// import {getKeyScaleForColor} from '../util.js';
import {ColorTextsMode, ColorTextsView} from '../view/color-texts.js';

interface Config {
	colorType: ColorType;
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

function createFormatter(type: ColorType): Formatter<number> {
	return createNumberFormatter(type === 'float' ? 2 : 0);
}

type ColorMode = 'hsl' | 'hsv' | 'srgb';

function createConstraint(
	mode: ColorMode,
	type: ColorType,
	index: number,
): Constraint<number> {
	const [min, max] = getRangeForChannel(mode, index);

	const coefficient = type === 'int' && mode === 'srgb' ? 255 : 1;

	return new DefiniteRangeConstraint({
		min: min * coefficient,
		max: max * coefficient,
	});
}

function createComponentController(
	doc: Document,
	config: {
		parser: Parser<number>;
		viewProps: ViewProps;
		colorMode: ColorMode;
		colorType: ColorType;
	},
	index: number,
): NumberTextController {
	return new NumberTextController(doc, {
		arrayPosition: index === 0 ? 'fst' : index === 3 - 1 ? 'lst' : 'mid',
		parser: config.parser,
		props: ValueMap.fromObject({
			formatter: createFormatter(config.colorType),
			keyScale: 1, //, getKeyScaleForColor(false),
			pointerScale: config.colorType === 'float' ? 0.01 : 1,
		}),
		value: createValue(0, {
			constraint: createConstraint(config.colorMode, config.colorType, index),
		}),
		viewProps: config.viewProps,
	});
}

function createComponentControllers(
	doc: Document,
	config: {
		colorMode: ColorMode;
		colorType: ColorType;
		value: Value<ColorPlus>;
		viewProps: ViewProps;
	},
): NumberTextController[] {
	const cc = {
		colorMode: config.colorMode,
		colorType: config.colorType,
		parser: parseNumber,
		viewProps: config.viewProps,
	};
	return [0, 1, 2].map((i) => {
		const c = createComponentController(doc, cc, i);
		connectValues({
			primary: config.value,
			// Like the 'view'
			secondary: c.value,
			// From ColorPlus model to number in text field
			forward(p) {
				const coefficient =
					config.colorType === 'int' && config.colorMode === 'srgb' ? 255 : 1;
				return (p.getAll(config.colorMode)[i] ?? 0) * coefficient;
			},
			// Number in text field to ColorPlus model
			backward(p, s) {
				// Number / channel to ColorPlus object
				// TODO setChannel method on ColorPlus?
				const comps = p.getAll(config.colorMode);
				const coefficient =
					config.colorType === 'int' && config.colorMode === 'srgb' ? 255 : 1;

				comps[i] = s / coefficient;
				p.setAll(comps, config.colorMode);

				return p.clone();
			},
		});
		return c;
	});
}

function createHexController(
	doc: Document,
	config: {
		value: Value<ColorPlus>;
		viewProps: ViewProps;
	},
) {
	const c = new TextController<ColorPlus>(doc, {
		// Text to color
		parser: (text: string) => {
			const parsedColor = ColorPlus.create(text);
			if (parsedColor === undefined) {
				return null;
			}
			parsedColor.convert('hsv');
			parsedColor.toGamut('srgb');
			parsedColor.alpha = config.value.rawValue.alpha;

			return parsedColor;
		},
		props: ValueMap.fromObject({
			formatter: (value: ColorPlus): string => {
				const serialized = value.serialize(
					{format: 'hex'},
					// Never show alpha in text field, since we have the slider below
					false,
				);
				return serialized;
			},
		}),
		value: createValue(ColorPlus.create('0x000000')!),
		viewProps: config.viewProps,
	});

	connectValues({
		primary: config.value,
		secondary: c.value,
		// TODO hmm
		forward: (p) => {
			return p.clone();
		},
		// TODO hmm, s
		backward: (p, s) => {
			return s;
		},
	});

	return [c] as ComponentValueController[];
}

function isColorMode(mode: ColorTextsMode): mode is ColorMode {
	return mode !== 'hex';
}

type ComponentValueController = ValueController<unknown, InputView>;

/**
 * @hidden
 */
export class ColorTextsController
	implements ValueController<ColorPlus, ColorTextsView>
{
	public readonly colorMode: Value<ColorTextsMode>;
	public readonly value: Value<ColorPlus>;
	public readonly view: ColorTextsView;
	public readonly viewProps: ViewProps;
	private readonly colorType_: ColorType;
	private ccs_: ComponentValueController[];

	constructor(doc: Document, config: Config) {
		this.onModeSelectChange_ = this.onModeSelectChange_.bind(this);

		this.colorType_ = config.colorType;
		this.value = config.value;
		this.viewProps = config.viewProps;

		// HMM, initial color setting?
		// this.colorMode = createValue(this.value.rawValue.mode as ColorTextsMode);
		this.colorMode = createValue('srgb');
		this.ccs_ = this.createComponentControllers_(doc);

		this.view = new ColorTextsView(doc, {
			mode: this.colorMode,
			inputViews: [this.ccs_[0].view, this.ccs_[1].view, this.ccs_[2].view],
			viewProps: this.viewProps,
		});
		this.view.modeSelectElement.addEventListener(
			'change',
			this.onModeSelectChange_,
		);
	}

	private createComponentControllers_(
		doc: Document,
	): ComponentValueController[] {
		const mode = this.colorMode.rawValue;
		if (isColorMode(mode)) {
			return createComponentControllers(doc, {
				colorMode: mode,
				colorType: this.colorType_,
				value: this.value,
				viewProps: this.viewProps,
			}) as ComponentValueController[];
		}
		return createHexController(doc, {
			value: this.value,
			viewProps: this.viewProps,
		});
	}

	private onModeSelectChange_(ev: Event) {
		const selectElem = ev.currentTarget as HTMLSelectElement;
		this.colorMode.rawValue = selectElem.value as ColorMode;

		this.ccs_ = this.createComponentControllers_(
			this.view.element.ownerDocument,
		);
		this.view.inputViews = this.ccs_.map((cc) => cc.view);
	}
}
