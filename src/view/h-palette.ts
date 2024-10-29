import {ClassName, mapRange, Value, View, ViewProps} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus.js';

const cn = ClassName('hpl');

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

/**
 * @hidden
 */
export class HPaletteView implements View {
	public readonly element: HTMLElement;
	public readonly value: Value<ColorPlus>;
	private readonly markerElem_: HTMLDivElement;

	constructor(doc: Document, config: Config) {
		this.onValueChange_ = this.onValueChange_.bind(this);

		this.value = config.value;
		this.value.emitter.on('change', this.onValueChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(cn());
		config.viewProps.bindClassModifiers(this.element);
		config.viewProps.bindTabIndex(this.element);

		const colorElem = doc.createElement('div');
		colorElem.classList.add(cn('c'));
		this.element.appendChild(colorElem);

		const markerElem = doc.createElement('div');
		markerElem.classList.add(cn('m'));
		this.element.appendChild(markerElem);
		this.markerElem_ = markerElem;

		this.update_();
	}

	private update_(): void {
		const backgroundColor = this.value.rawValue.clone('srgb');
		const h = backgroundColor.get('h', 'hsv');
		backgroundColor.setAll([h, 100, 100], 'hsv');

		this.markerElem_.style.backgroundColor = backgroundColor.serialize('rgba');
		const left = mapRange(h, 0, 360, 0, 100);
		this.markerElem_.style.left = `${left}%`;
	}

	private onValueChange_(): void {
		this.update_();
	}
}
