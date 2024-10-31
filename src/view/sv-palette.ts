import {
	ClassName,
	getCanvasContext,
	mapRange,
	Value,
	View,
	ViewProps,
} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus';

const cn = ClassName('svp');

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

const CANVAS_RESOL = 64;

/**
 * @hidden
 */
export class SvPaletteView implements View {
	public readonly element: HTMLElement;
	public readonly value: Value<ColorPlus>;
	public readonly canvasElement: HTMLCanvasElement;
	private readonly markerElem_: HTMLDivElement;

	constructor(doc: Document, config: Config) {
		this.onValueChange_ = this.onValueChange_.bind(this);

		this.value = config.value;
		this.value.emitter.on('change', this.onValueChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(cn());
		config.viewProps.bindClassModifiers(this.element);
		config.viewProps.bindTabIndex(this.element);

		const canvasElem = doc.createElement('canvas');
		canvasElem.height = CANVAS_RESOL;
		canvasElem.width = CANVAS_RESOL;
		canvasElem.classList.add(cn('c'));
		this.element.appendChild(canvasElem);
		this.canvasElement = canvasElem;

		const markerElem = doc.createElement('div');
		markerElem.classList.add(cn('m'));
		this.element.appendChild(markerElem);
		this.markerElem_ = markerElem;

		this.update_();
	}

	private update_(): void {
		const ctx = getCanvasContext(this.canvasElement);
		if (!ctx) {
			return;
		}

		const c = this.value.rawValue.clone();
		c.convert('hsv');
		const width = this.canvasElement.width;
		const height = this.canvasElement.height;
		const imgData = ctx.getImageData(0, 0, width, height);
		const data = imgData.data;

		// TODO faster way?
		for (let iy = 0; iy < height; iy++) {
			for (let ix = 0; ix < width; ix++) {
				c.set('s', mapRange(ix, 0, width, 0, 100));
				c.set('v', mapRange(iy, 0, height, 100, 0));

				const [r, g, b] = c.getAll('srgb');

				const i = (iy * width + ix) * 4;
				data[i] = r * 255;
				data[i + 1] = g * 255;
				data[i + 2] = b * 255;
				data[i + 3] = 255;
			}
		}
		ctx.putImageData(imgData, 0, 0);

		const [, s, v] = this.value.rawValue.getAll('hsv');

		const left = mapRange(s, 0, 100, 0, 100);
		this.markerElem_.style.left = `${left}%`;
		const top = mapRange(v, 0, 100, 100, 0);
		this.markerElem_.style.top = `${top}%`;
	}

	private onValueChange_(): void {
		this.update_();
	}
}
