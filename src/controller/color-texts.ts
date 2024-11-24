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

import {ColorPlus} from '../model/color-plus.js';
import {
	ColorType,
	denormalizeCoord,
	getRangeForChannel,
	normalizeCoord,
} from '../model/shared.js';
// import {getKeyScaleForColor} from '../util.js';
import {ColorTextsMode, ColorTextsView} from '../view/color-texts.js';

interface Config {
	colorType: ColorType;
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

function createFormatter(type: ColorType): Formatter<number> {
	return createNumberFormatter(type === 'float' ? 3 : 0);
}

type ColorMode = 'hsl' | 'hsv' | 'srgb';

function createConstraint(
	mode: ColorMode,
	type: ColorType,
	index: number,
): Constraint<number> {
	if (type === 'float') {
		return new DefiniteRangeConstraint({min: 0, max: 1});
	}

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
			keyScale: config.colorType === 'float' ? 0.01 : 1, // TODO revisit was getKeyScaleForColor(false)
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
			// From HSV ColorPlus model to number in text field
			// Note edge case for int srgb representation
			forward(p) {
				let rawValue = p.getAll(config.colorMode)[i] ?? 0;

				// Edge case to prevent wrapping 360 to 0 in HSL
				// TODO revisit
				if (
					i === 0 &&
					config.colorMode === 'hsl' &&
					(p.get('h', 'hsv') ?? 0) === 360
				) {
					rawValue = 360;
				}

				return config.colorType === 'float'
					? normalizeCoord(config.colorMode, i, rawValue)
					: rawValue * (config.colorMode === 'srgb' ? 255 : 1);
			},
			// Number in text field to ColorPlus model
			backward(p, s) {
				// Number / channel to ColorPlus object
				// Note edge case for int srgb representation
				// TODO setChannel method on ColorPlus?
				const newColor = p.clone();
				const comps = newColor.getAll(config.colorMode);

				comps[i] =
					config.colorType === 'float'
						? denormalizeCoord(config.colorMode, i, s ?? 0)
						: (s ?? 0) / (config.colorMode === 'srgb' ? 255 : 1);
				newColor.setAll(comps, config.colorMode);

				// Edge case to prevent wrapping 360 to 0 in HSL
				if (
					i === 0 &&
					config.colorMode === 'hsl' &&
					((config.colorType === 'int' && s === 360) ||
						(config.colorType === 'float' && s === 1))
				) {
					console.log('edge');
					newColor.set('h', 360);
				}

				return newColor;
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
			// parsedColor.toGamut('srgb');
			parsedColor.alpha = config.value.rawValue.alpha;

			return parsedColor;
		},
		props: ValueMap.fromObject({
			formatter: (value: ColorPlus): string => {
				const serialized = value.serialize({
					format: 'hex',
					alpha: false,
					space: 'srgb',
					type: 'string',
				});
				return serialized;
			},
		}),
		value: createValue(config.value.rawValue.clone()),
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
