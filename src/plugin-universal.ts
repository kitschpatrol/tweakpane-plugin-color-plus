import {
	type ColorInputParams,
	createPlugin,
	type InputBindingPlugin,
} from '@tweakpane/core';
import type {Color as ColorValueInternal} from 'culori';
import * as culori from 'culori';

export type ColorValueExternal = string | number | Record<string, number>;
export type ColorPlusInputParams = ColorInputParams;

function parseColorValueExternal(
	value: unknown,
	params: ColorPlusInputParams,
): ColorValueInternal | undefined {
	if (typeof value === 'string') {
		// Trust in culori...
		return culori.parse(value);
	}

	if (typeof value === 'number') {
		// Turn number into hex string
		return culori.parseHex(
			params.color?.alpha
				? `#${(0xffffffff & value).toString(16).toUpperCase().padStart(8, '0')}`
				: `#${(0xffffff & value).toString(16).toUpperCase().padStart(6, '0')}`,
		);
	}

	if (typeof value === 'object') {
		// TODO turn into CSS string based on key patterns
		return undefined;
	}
}

export const ColorPlusInputPlugin: InputBindingPlugin<
	ColorValueInternal,
	ColorValueExternal,
	ColorPlusInputParams
> = createPlugin({
	id: 'input-color-plus',
	type: 'input',
	accept(value, params) {
		if (params.view !== 'color-plus') {
			return null;
		}

		// Attempt to parse
		// TODO float
		const colorString = stringifyColorValueExternal(value);
		if (colorString === undefined) {
			return null;
		}

		const color = culori.parse(colorString);

		if (color === undefined) {
			return null;
		}

		// Return the parsed color
		return {
			initialValue: value as ColorValueExternal,
			params: {},
		};
	},
	binding: {
		reader: (args) => {
			return args.target.read();
		},
		equals: (a, b) => {
			// TODO
			return a === b;
		},
		writer: (args) => {
			const writer = createColorStringWriter(args.params.format);
			if (!writer) {
				throw TpError.notBindable();
			}
			return writer;
		},
	},
	controller: (args) => {
		return new ColorController(args.document, {
			colorType: args.params.format.type,
			expanded: args.params.expanded ?? false,
			formatter: args.params.stringifier,
			parser: createColorStringParser('int'),
			pickerLayout: args.params.picker ?? 'popup',
			supportsAlpha: args.params.format.alpha,
			value: args.value,
			viewProps: args.viewProps,
		});
	},
});
