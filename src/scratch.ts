// import Color from 'colorjs.io';
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

const c = ColorPlus.create('#f00', 'always')!;

console.log(c.serialize());
console.log(c.get('h', 'hsv'));
c.set('h', 180, 'hsv');

c.set(
	'h',
	(value) => {
		console.log(value);
		return value + 60;
	},
	'hsv',
);

c.alpha = 0.5;

console.log(c?.get('h', 'hsv'));
console.log(c?.serialize('rgba'));

// console.log(ColorPlus.create('#f00c', 'never')?.serialize());
// console.log(ColorPlus.create('#ff0000')?.serialize());
// console.log(ColorPlus.create('#ff00ff')?.serialize());
// console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// console.log(ColorPlus.create('rgb(255, 0, 255)', 'auto')?.serialize());
// console.log(ColorPlus.create('rgba(255, 0, 255, 1)')?.serialize());
// console.log(ColorPlus.create('#ff00ffcc')?.serialize());
// console.log(ColorPlus.create('rgb(255 1 1)', 'always')?.serialize());
// console.log(ColorPlus.create('rgb(255 255 255 / 1)', 'never')?.serialize());
// console.log(ColorPlus.create('rgb(255 255 255 / 10%)')?.serialize());
// console.log(ColorPlus.create('rgb(255, 255, 255)', 'auto')?.serialize());
