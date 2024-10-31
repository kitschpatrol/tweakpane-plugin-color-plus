import {ClassName, Value, View, ViewProps} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus.js';

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

const cn = ClassName('colsw');

/**
 * @hidden
 */
export class ColorSwatchView implements View {
	public readonly element: HTMLElement;
	public readonly value: Value<ColorPlus>;
	public readonly buttonElement: HTMLButtonElement;
	private readonly swatchElem_: HTMLDivElement;

	constructor(doc: Document, config: Config) {
		this.onValueChange_ = this.onValueChange_.bind(this);

		config.value.emitter.on('change', this.onValueChange_);
		this.value = config.value;

		this.element = doc.createElement('div');
		this.element.classList.add(cn());
		config.viewProps.bindClassModifiers(this.element);

		const swatchElem = doc.createElement('div');
		swatchElem.classList.add(cn('sw'));
		this.element.appendChild(swatchElem);
		this.swatchElem_ = swatchElem;

		const buttonElem = doc.createElement('button');
		buttonElem.classList.add(cn('b'));
		config.viewProps.bindDisabled(buttonElem);
		this.element.appendChild(buttonElem);
		this.buttonElement = buttonElem;

		this.update_();
	}

	private update_(): void {
		const value = this.value.rawValue;
		this.swatchElem_.style.backgroundColor = value.serialize({
			format: 'rgba',
		});
	}

	private onValueChange_(): void {
		this.update_();
	}
}
