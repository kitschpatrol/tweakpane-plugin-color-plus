import {ClassName, Value, View, ViewProps} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus.js';

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

const cn = ClassName('colsw');

export class ColorSwatchView implements View {
	public readonly element: HTMLElement;
	public readonly value: Value<ColorPlus>;
	public readonly buttonElement: HTMLButtonElement;
	private readonly swatchRealElem_: HTMLDivElement;
	private readonly swatchFallbackElem_: HTMLDivElement;

	constructor(doc: Document, config: Config) {
		this.onValueChange_ = this.onValueChange_.bind(this);

		config.value.emitter.on('change', this.onValueChange_);
		this.value = config.value;

		this.element = doc.createElement('div');
		this.element.classList.add(cn());
		config.viewProps.bindClassModifiers(this.element);

		const swatchRealElem = doc.createElement('div');
		swatchRealElem.classList.add(cn('sw'));
		this.element.appendChild(swatchRealElem);
		this.swatchRealElem_ = swatchRealElem;

		const swatchFallbackElem = doc.createElement('div');
		swatchFallbackElem.style.width = '100%';
		swatchFallbackElem.style.height = '100%';
		swatchFallbackElem.style.clipPath = 'polygon(100% 0%, 0% 100%, 100% 100%)';
		swatchRealElem.appendChild(swatchFallbackElem);
		this.swatchFallbackElem_ = swatchFallbackElem;

		const buttonElem = doc.createElement('button');
		buttonElem.classList.add(cn('b'));
		config.viewProps.bindDisabled(buttonElem);
		this.element.appendChild(buttonElem);
		this.buttonElement = buttonElem;

		this.update_();
	}

	private update_(): void {
		const value = this.value.rawValue;

		this.swatchRealElem_.style.opacity = value.alpha.toString();
		this.swatchRealElem_.style.backgroundColor = value.serialize({
			format: 'oklch',
			alpha: false,
			space: 'oklch',
			type: 'string',
		});

		const fallbackColor = value.clone();
		fallbackColor.toGamut('srgb');
		this.swatchFallbackElem_.style.backgroundColor = fallbackColor.serialize({
			format: 'oklch',
			alpha: false,
			space: 'oklch',
			type: 'string',
		});
	}

	private onValueChange_(): void {
		this.update_();
	}
}
