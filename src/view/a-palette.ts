import {ClassName, mapRange, Value, View, ViewProps} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus.js';

const cn = ClassName('apl');

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

/**
 * @hidden
 */
export class APaletteView implements View {
	public readonly element: HTMLElement;
	public readonly value: Value<ColorPlus>;
	private readonly colorElem_: HTMLDivElement;
	private readonly markerElem_: HTMLDivElement;
	private readonly previewElem_: HTMLDivElement;

	constructor(doc: Document, config: Config) {
		this.onValueChange_ = this.onValueChange_.bind(this);

		this.value = config.value;
		this.value.emitter.on('change', this.onValueChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(cn());
		config.viewProps.bindClassModifiers(this.element);
		config.viewProps.bindTabIndex(this.element);

		const barElem = doc.createElement('div');
		barElem.classList.add(cn('b'));
		this.element.appendChild(barElem);

		const colorElem = doc.createElement('div');
		colorElem.classList.add(cn('c'));
		barElem.appendChild(colorElem);
		this.colorElem_ = colorElem;

		const markerElem = doc.createElement('div');
		markerElem.classList.add(cn('m'));
		this.element.appendChild(markerElem);
		this.markerElem_ = markerElem;

		const previewElem = doc.createElement('div');
		previewElem.classList.add(cn('p'));
		this.markerElem_.appendChild(previewElem);
		this.previewElem_ = previewElem;

		this.update_();
	}

	private update_(): void {
		const activeColor = this.value.rawValue.clone();
		activeColor.convert('srgb');
		const leftColor = activeColor.clone();
		leftColor.alpha = 0;

		const rightColor = leftColor.clone();
		rightColor.alpha = 1;

		const gradientComps = [
			'to right',
			leftColor.serialize({
				format: 'rgba',
				alpha: true,
				space: 'srgb',
				type: 'string',
			}),
			rightColor.serialize({
				format: 'rgba',
				alpha: true,
				space: 'srgb',
				type: 'string',
			}),
		];
		this.colorElem_.style.background = `linear-gradient(${gradientComps.join(
			',',
		)})`;

		this.previewElem_.style.backgroundColor = activeColor.serialize({
			format: 'rgba',
			alpha: true,
			space: 'srgb',
			type: 'string',
		});
		const left = mapRange(activeColor.alpha, 0, 1, 0, 100);
		this.markerElem_.style.left = `${left}%`;
	}

	private onValueChange_(): void {
		this.update_();
	}
}
