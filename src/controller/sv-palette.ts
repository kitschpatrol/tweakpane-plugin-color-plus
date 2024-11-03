import {
	constrainRange,
	getHorizontalStepKeys,
	getStepForKey,
	getVerticalStepKeys,
	isArrowKey,
	mapRange,
	PointerData,
	PointerHandler,
	PointerHandlerEvents,
	Value,
	ValueChangeOptions,
	ValueController,
	ViewProps,
} from '@tweakpane/core';

import {ColorPlus} from '../model/color-plus.js';
import {getKeyScaleForColor} from '../util.js';
import {SvPaletteView} from '../view/sv-palette.js';

interface Config {
	value: Value<ColorPlus>;
	viewProps: ViewProps;
}

/**
 * @hidden
 */
export class SvPaletteController
	implements ValueController<ColorPlus, SvPaletteView>
{
	public readonly value: Value<ColorPlus>;
	public readonly view: SvPaletteView;
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

		this.view = new SvPaletteView(doc, {
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

		const saturation = constrainRange(
			mapRange(d.point.x, 0, d.bounds.width, 0, 100),
			0,
			100,
		);
		const value = constrainRange(
			mapRange(d.point.y, 0, d.bounds.height, 100, 0),
			0,
			100,
		);

		const c = this.value.rawValue.clone();
		const h = c.get('h', 'hsv');

		c.setAll([h, saturation, value], 'hsv');

		console.log(`post saturation: ${c.get('s', 'hsv')}`);
		console.log(`post value: ${c.get('v', 'hsv')}`);

		this.value.setRawValue(c.clone(), opts);
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
		if (isArrowKey(ev.key)) {
			ev.preventDefault();
		}

		const keyScale = getKeyScaleForColor(false);
		const ds = getStepForKey(keyScale, getHorizontalStepKeys(ev));
		const dv = getStepForKey(keyScale, getVerticalStepKeys(ev));
		if (ds === 0 && dv === 0) {
			return;
		}

		const c = this.value.rawValue;
		const [h, s, v] = c.getAll('hsv');
		c.setAll([h, s + ds, v + dv], 'hsv');
		this.value.setRawValue(c.clone(), {
			forceEmit: false,
			last: false,
		});
	}

	private onKeyUp_(ev: KeyboardEvent): void {
		const keyScale = getKeyScaleForColor(false);
		const ds = getStepForKey(keyScale, getHorizontalStepKeys(ev));
		const dv = getStepForKey(keyScale, getVerticalStepKeys(ev));
		if (ds === 0 && dv === 0) {
			return;
		}

		this.value.setRawValue(this.value.rawValue, {
			forceEmit: true,
			last: true,
		});
	}
}
