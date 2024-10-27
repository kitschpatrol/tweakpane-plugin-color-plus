import Color from 'colorjs.io';

const color = new Color('#ff00ff');

// console.log(color);
// console.log('----------------------------------');
// console.log(color.to('srgb')); // #ff0000
// console.log('----------------------------------');
const q = color.to('hsv');

console.log(q.h);
console.log(q.s);
console.log(q.v);

console.log(q.toString({format: 'rgba'}));
