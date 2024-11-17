import Color from 'colorjs.io';
// // import {toGamutCSS} from 'colorjs.io/fn';

// import {mapRange} from '@tweakpane/core';

// import {
// 	ColorFormat,
// 	ColorPlusObject,
// 	ColorSpaceId,
// 	ColorType,
// 	getRangeForChannel,
// 	ObjectFormat,
// 	TupleFormat,
// } from './model/color-plus';
const colora = new Color('color(hsl 360 0 0)');
const colorb = colora.clone().to('srgb');
console.log(colora.toString());
console.log(colora.coords);
console.log(colorb.coords);
// // // console.log('----------------------------------');
// // // console.log(color.to('srgb')); // #ff0000
// // // console.log('----------------------------------');
// // // const q = new Color('rgb(300, 300, 300 / .5)');

// // // console.log(q.h);
// // // console.log(q.s);
// // // console.log(q.v);

// // // console.log(q.toString());

// // // const c = ColorPlus.create('#f00')!;
// // // const f = ColorPlus.getFormat('#f00');

// // // console.log(c.serialize(f!));
// // // console.log(c.get('h', 'hsv'));
// // // c.set('h', 361, 'hsv');
// // // console.log('h');
// // // console.log(c.get('h', 'hsv'));

// // // c.set(
// // // 	'h',
// // // 	(value) => {
// // // 		console.log(value);
// // // 		return value + 60;
// // // 	},
// // // 	'hsv',
// // // );

// // // console.log(c.get('h', 'hsv'));

// // // c.alpha = 0.5;

// // // console.log(c?.serialize({format: 'rgba', alpha: true, space: 'srgb'}));

// // // // console.log(ColorPlus.create('#f00c', 'never')?.serialize());
// // // // console.log(ColorPlus.create('#ff0000')?.serialize());
// // // // console.log(ColorPlus.create('#ff00ff')?.serialize());
// // // // console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// // // // console.log(ColorPlus.create('rgb(255, 0, 255)', 'auto')?.serialize());
// // // // console.log(ColorPlus.create('rgba(255, 0, 255, 1)')?.serialize());
// // // // console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// // // // console.log(ColorPlus.create('rgb(255 1 1)')?.serialize());
// // // // console.log(ColorPlus.create('rgb(255 255 255 / 1)', 'never')?.serialize());
// // // // console.log(ColorPlus.create('rgb(255 255 255 / 10%)')?.serialize());
// // // // console.log(ColorPlus.create('rgb(255, 255, 255)', 'auto')?.serialize());

// // // console.log('----------------------------------');
// // // const d = ColorPlus.create('rgb(300, 300, 300 / .5)')!;
// // // const df = ColorPlus.getFormat('rgb(300, 300, 300 / .5)');
// // // d.set('r', 800);

// // // console.log(d.getAll());
// // // console.log(d.serialize(df!));

// // // console.log('----------------------------------');
// // // let e = new Color('rgb(900, 300, 300 / .5)');

// // // e = e.to('hsl');
// // // e.h = 370;
// // // e.toGamut({
// // // 	method: 'clip',
// // // });

// // // console.log('----------------------------------');
// // // console.log('----------------------------------');
// // // const nv = 0xff00ff;
// // // const n = ColorPlus.create(nv);
// // // const nf = ColorPlus.getFormat(nv);

// // // console.log(nv);
// // // console.log('----------------------------------');
// // // const v = n?.toValue(nf!);
// // // console.log(n?.serialize(nf!));
// // // console.log(v);
// // // console.log(typeof n?.serialize(nf!));
// // // console.log(typeof n?.toValue(nf!));

// // // const p = ColorPlus.create(0xff00ffcc);
// // // const pf = ColorPlus.getFormat(0xff00ffcc);
// // // console.log(p);

// // // console.log(p?.toValue(pf!));
// // // p?.convert('hsv');
// // // console.log(p?.toValue(pf!));
// // // p?.convert('srgb');
// // // console.log(p?.toValue(pf!));

// // // console.log(p?.serialize(pf!));

// // // console.log('----------------------------------');
// // // console.log(getRangeForChannel('hsv', 0));
// // // console.log(getRangeForChannel('hsl', 0));

// // const a = ColorPlus.create('oklch(4% none 520deg)');
// // console.log(a?.toString());
// // const f = ColorPlus.getFormat('oklch(4% none 520deg)');
// // a!.convert('hsv');
// // console.log(a?.toString());
// // a!.toGamut('srgb');
// // console.log(a?.toString());
// // console.log(a?.serialize(f!));

// // function modeForKeys(keys: string[]): ObjectColorModes | undefined {
// // 	const lowerKeys = keys.map((key) => key.toLowerCase());

// // 	for (const format of colorObjectFormats) {
// // 		const {space: mode, channels} = format;

// // 		const hasAllChannels =
// // 			channels.every((channel) =>
// // 				channel.externalKeys.some((key) =>
// // 					lowerKeys.includes(key.toLowerCase()),
// // 				),
// // 			) &&
// // 			lowerKeys.every((inputKey) =>
// // 				channels.some((channel) =>
// // 					channel.externalKeys.some((key) => key.toLowerCase() === inputKey),
// // 				),
// // 			);

// // 		if (hasAllChannels) {
// // 			return mode;
// // 		}
// // 	}

// // 	return undefined;
// // }

// // Usage examples:
// // console.log(objectToColor({r: 255, g: 128, b: 0, a: 255})); // valid
// // console.log(objectToColor({r: 255, g: 128, blue: 0, ALPHA: 255})); // valid
// // console.log(objectToColor({r: 255, g: 128, b: 0, a: 255, extra: 1})); // invalid
// // console.log(objectToColor({r: '255', g: 128, b: 0})); // invalid - string value
// // console.log(objectToColor(null)); // invalid
// // console.log(objectToColor([255, 128, 0])); // invalid - array
// // console.log(objectToColor({r: 255, g: 128, b: NaN})); // invalid - NaN
// // console.log(objectToColor({r: 255, g: 128, b: Infinity})); // invalid - Infinity

// // function roundTo(value: number, decimals: number): number {
// // 	const multiplier = 10 ** decimals;
// // 	return Math.round(value * multiplier) / multiplier;
// // }

// // function colorToObject(
// // 	color: Color,
// // 	keys: string[],
// // 	isFloat: boolean = false,
// // 	precision: number | undefined = 3,
// // ): Record<string, number> | undefined {
// // 	// Infer the target color mode based on the keys in the destination object
// // 	const targetMode = modeForKeys(keys);
// // 	if (!targetMode) {
// // 		return undefined;
// // 	}

// // 	// Convert the source color to the target implied by the object keys if needed
// // 	const sourceColor =
// // 		color.mode === targetMode
// // 			? {...color}
// // 			: culori.converter(color.mode)({...color});

// // 	// Always have alpha, in case the destination object has an alpha key and the source does not
// // 	sourceColor.alpha = sourceColor.alpha ?? 1;

// // 	// Find the format configuration for the target mode
// // 	const targetFormat = colorObjectFormats.find(
// // 		(format) => format.mode === targetMode,
// // 	);

// // 	if (!targetFormat) {
// // 		return undefined;
// // 	}

// // 	const colorObject: Record<string, number> = {};

// // 	// Process each requested key
// // 	for (const key of keys) {
// // 		const lowerKey = key.toLowerCase();

// // 		// Find the channel that matches this key
// // 		const channel = targetFormat.channels.find((c) =>
// // 			c.externalKeys.some((k) => k.toLowerCase() === lowerKey),
// // 		);

// // 		if (!channel) {
// // 			return undefined;
// // 		}

// // 		const rawValue: number = sourceColor[
// // 			channel.internalKey as keyof Color
// // 		] as number;

// // 		let value: number;
// // 		if (isFloat) {
// // 			value = channel.toFloat ? channel.toFloat(rawValue) : rawValue;
// // 		} else {
// // 			value = channel.toInt ? channel.toInt(rawValue) : rawValue;
// // 		}

// // 		if (precision !== undefined) {
// // 			value = roundTo(value, precision);
