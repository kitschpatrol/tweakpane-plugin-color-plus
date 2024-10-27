import Color from 'colorjs.io';

console.log(new Color('rgb(255, 255, 255)').toString());
// console.log(new Color('rgba(255, 255, 255, 20)').toString());
// console.log(new Color('#ff0000').toString());
// console.log(new Color('red').toString());
// console.log(new Color('red').parseMeta);

console.log(new Color('hsl(0deg, 100%, 50%)').toString()); /* Legacy format */
console.log(new Color('hsl(0deg 100% 50%)').toString()); /* Legacy format */
console.log(
	new Color('hsl(45deg 100% 50% / 1)').toString({
		alpha: true,
	}),
); /* With alpha */
