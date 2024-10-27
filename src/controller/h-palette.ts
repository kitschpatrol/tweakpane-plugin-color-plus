import {
	constrainRange,
	getHorizontalStepKeys,
	getStepForKey,
	mapRange,
	PointerData,
	PointerHandler,
	PointerHandlerEvents,
	Value,
	ValueChangeOptions,
	ValueController,
	ViewProps,
} from '@tweakpane/core';

import {ColorValueInternal} from '../plugin.js';
import {getKeyScaleForColor} from '../util.js';
import {HPaletteView} from '../view/h-palette.js';

interface Config {
	value: Value<ColorValueInternal>;
	viewProps: ViewProps;
}

/**
 * @hidden
 */
export class HPaletteController
	implements ValueController<ColorValueInternal, HPaletteView>
{
	public readonly value: Value<ColorValueInternal>;
	public readonly view: HPaletteView;
	public readonly viewProps: ViewProps;
	private readonly ptHandler_: PointerHandler;

	constructor(doc: Document, config: Config) {
		this.onKeyDown_ = this.onKeyDown_.bind(this);
		this.onKeyUp_ = this.onKeyUp_.bind(this);
		this.onPointerDown_ = this.onPointerDown_.bind(this);
		this.onPointerMove_ = this.onPointerMove_.bind(this);
		this.onPointerUp_ = this.onPointerUp_.bind(this);

		this.value = config.value;
		this.viewProps = config.viewProps;

		this.view = new HPaletteView(doc, {
			value: this.value,
			viewProps: this.viewProps,
		});

		this.ptHandler_ = new PointerHandler(this.view.element);
		this.ptHandler_.emitter.on('down', this.onPointerDown_);
		this.ptHandler_.emitter.on('move', this.onPointerMove_);
		this.ptHandler_.emitter.on('up', this.onPointerUp_);

		this.view.element.addEventListener('keydown', this.onKeyDown_);
		this.view.element.addEventListener('keyup', this.onKeyUp_);
	}

	private handlePointerEvent_(d: PointerData, opts: ValueChangeOptions): void {
		if (!d.point) {
			return;
		}

		const hue = mapRange(
			constrainRange(d.point.x, 0, d.bounds.width),
			0,
			d.bounds.width,
			0,
			360,
		);

		const c = this.value.rawValue.to('hsv');
		c.h = hue;

		this.value.setRawValue(c, opts);
	}

	private onPointerDown_(ev: PointerHandlerEvents['down']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: false,
			last: false,
		});
	}

	private onPointerMove_(ev: PointerHandlerEvents['move']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: false,
			last: false,
		});
	}

	private onPointerUp_(ev: PointerHandlerEvents['up']): void {
		this.handlePointerEvent_(ev.data, {
			forceEmit: true,
			last: true,
		});
	}

	private onKeyDown_(ev: KeyboardEvent): void {
		const step = getStepForKey(
			getKeyScaleForColor(false),
			getHorizontalStepKeys(ev),
		);
		if (step === 0) {
			return;
		}

		const c = this.value.rawValue.to('hsv');
		c.h += step;
		this.value.setRawValue(c, {
			forceEmit: false,
			last: false,
		});
	}

	private onKeyUp_(ev: KeyboardEvent): void {
		const step = getStepForKey(
			getKeyScaleForColor(false),
			getHorizontalStepKeys(ev),
		);
		if (step === 0) {
			return;
		}

		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		});
	}
}
