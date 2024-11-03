import Color from 'colorjs.io';

import {ColorPlus} from './model/color-plus';
// const color = new Color('#ff00ff');

// console.log(color);
// console.log('----------------------------------');
// console.log(color.to('srgb')); // #ff0000
// console.log('----------------------------------');
// const q = new Color('rgb(300, 300, 300 / .5)');

// console.log(q.h);
// console.log(q.s);
// console.log(q.v);

// console.log(q.toString());

const c = ColorPlus.create('#f00')!;
const f = ColorPlus.getFormat('#f00');

console.log(c.serialize(f!));
console.log(c.get('h', 'hsv'));
c.set('h', 361, 'hsv');
console.log('h');
console.log(c.get('h', 'hsv'));

c.set(
	'h',
	(value) => {
		console.log(value);
		return value + 60;
	},
	'hsv',
);

console.log(c.get('h', 'hsv'));

c.alpha = 0.5;

console.log(c?.serialize({format: 'rgba', alpha: true, space: 'srgb'}));

// console.log(ColorPlus.create('#f00c', 'never')?.serialize());
// console.log(ColorPlus.create('#ff0000')?.serialize());
// console.log(ColorPlus.create('#ff00ff')?.serialize());
// console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// console.log(ColorPlus.create('rgb(255, 0, 255)', 'auto')?.serialize());
// console.log(ColorPlus.create('rgba(255, 0, 255, 1)')?.serialize());
// console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// console.log(ColorPlus.create('rgb(255 1 1)')?.serialize());
// console.log(ColorPlus.create('rgb(255 255 255 / 1)', 'never')?.serialize());
// console.log(ColorPlus.create('rgb(255 255 255 / 10%)')?.serialize());
// console.log(ColorPlus.create('rgb(255, 255, 255)', 'auto')?.serialize());

console.log('----------------------------------');
const d = ColorPlus.create('rgb(300, 300, 300 / .5)')!;
const df = ColorPlus.getFormat('rgb(300, 300, 300 / .5)');
d.set('r', 800);

console.log(d.getAll());
console.log(d.serialize(df!));

console.log('----------------------------------');
let e = new Color('rgb(900, 300, 300 / .5)');

e = e.to('hsl');
e.h = 370;
e.toGamut({
	method: 'clip',
});

console.log(e.h);
console.log(e.getAll());
console.log(e.toString());
