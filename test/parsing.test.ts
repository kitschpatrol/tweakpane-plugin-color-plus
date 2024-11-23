import {ColorPlus} from '../src/model/color-plus.js';
import {expect, it} from 'vitest';

it('parses hex colors correctly', () => {
	const tests = [
		['#f06', 'ColorPlus(srgb, [1,0,0.4], 1)'],
		['#f068', 'ColorPlus(srgb, [1,0,0.4], 0.5333333333333333)'],
		['#ff0066', 'ColorPlus(srgb, [1,0,0.4], 1)'],
		['#ff006688', 'ColorPlus(srgb, [1,0,0.4], 0.5333333333333333)'],
		['0xf06', 'ColorPlus(srgb, [1,0,0.4], 1)'],
		['0xf068', 'ColorPlus(srgb, [1,0,0.4], 0.5333333333333333)'],
		['0xff0066', 'ColorPlus(srgb, [1,0,0.4], 1)'],
		['0xff006688', 'ColorPlus(srgb, [1,0,0.4], 0.5333333333333333)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses number colors correctly', () => {
	const tests = [
		[0xff0066, 'ColorPlus(srgb, [1,0,0.4], 1)'],
		[0xff00667f, 'ColorPlus(srgb, [1,0,0.4], 0.4980392156862745)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses object colors correctly', () => {
	const tests = [
		[
			{
				r: 255,
				g: 0,
				b: 102,
			},
			'ColorPlus(srgb, [1,0,0.4], 1)',
		],
		[
			{
				r: 255,
				g: 0,
				b: 102,
				a: 0.5,
			},
			'ColorPlus(srgb, [1,0,0.4], 0.5)',
		],
		[
			{
				red: 255,
				green: 0,
				blue: 102,
			},
			'ColorPlus(srgb, [1,0,0.4], 1)',
		],
		[
			{
				red: 255,
				green: 0,
				blue: 102,
				alpha: 0.5,
			},
			'ColorPlus(srgb, [1,0,0.4], 0.5)',
		],
		[
			{
				r: 255,
				green: 0,
				b: 102,
			},
			'ColorPlus(srgb, [1,0,0.4], 1)',
		],
		[{h: 336, s: 100, l: 50}, 'ColorPlus(hsl, [336,100,50], 1)'],
		[{h: 336, s: 100, v: 100}, 'ColorPlus(hsv, [336,100,100], 1)'],
		[{h: 336, w: 0, b: 0}, 'ColorPlus(hwb, [336,0,0], 1)'],
		[{l: 55, a: 83, b: 21}, 'ColorPlus(lab, [55,83,21], 1)'],
		[
			{
				l: 55,
				c: 85,
				h: 14,
			},
			'ColorPlus(lch, [55,85,14], 1)',
		],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses object float colors correctly', () => {
	const tests = [
		[
			{
				r: 1,
				g: 0,
				b: 0.4,
			},
			'ColorPlus(srgb, [1,0,0.4], 1)',
		],
		[
			{
				r: 1,
				g: 0,
				b: 0.4,
				a: 0.5,
			},
			'ColorPlus(srgb, [1,0,0.4], 0.5)',
		],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input, undefined, 'float')?.toString()).toEqual(
			expected,
		);
	});
});

it('parses color tuples correctly', () => {
	const tests = [
		[[255, 0, 102], 'ColorPlus(srgb, [1,0,0.4], 1)'],
		[[255, 0, 102, 0.5], 'ColorPlus(srgb, [1,0,0.4], 0.5)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses color float tuples correctly', () => {
	const tests = [
		[[1, 0, 0.4], 'ColorPlus(srgb, [1,0,0.4], 1)'],
		[[1, 0, 0.4, 0.5], 'ColorPlus(srgb, [1,0,0.4], 0.5)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input, undefined, 'float')?.toString()).toEqual(
			expected,
		);
	});
});

it('parses color function colors correctly', () => {
	const tests = [
		['color(--hsv 25deg 50% 75)', 'ColorPlus(hsv, [25,50,75], 1)'],
		['color(a98-rgb 0 1 .5)', 'ColorPlus(a98rgb, [0,1,0.5], 1)'],
		['color(a98-rgb 0 100% 50%)', 'ColorPlus(a98rgb, [0,1,0.5], 1)'],
		['color(display-p3 0 1 .5)', 'ColorPlus(p3, [0,1,0.5], 1)'],
		['color(display-p3 0 1 0 / .5)', 'ColorPlus(p3, [0,1,0], 0.5)'],
		['color(display-p3 0% 100% 50%)', 'ColorPlus(p3, [0,1,0.5], 1)'],
		['color(display-p3 none 1 .5)', 'ColorPlus(p3, [none,1,0.5], 1)'],
		['color(prophoto-rgb 0 1 .5)', 'ColorPlus(prophoto, [0,1,0.5], 1)'],
		['color(prophoto-rgb 0 100% 50%)', 'ColorPlus(prophoto, [0,1,0.5], 1)'],
		['color(rec2020 0 1 .5)', 'ColorPlus(rec2020, [0,1,0.5], 1)'],
		['color(rec2020 0 100% 50%)', 'ColorPlus(rec2020, [0,1,0.5], 1)'],
		['color(srgb .9 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb +0.9 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb 0 1 .5)', 'ColorPlus(srgb, [0,1,0.5], 1)'],
		['color(srgb 0 100% 50%)', 'ColorPlus(srgb, [0,1,0.5], 1)'],
		['color(srgb 0.09e+1 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb 0.09e1 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb 9e-1 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb 9E-1 0 0)', 'ColorPlus(srgb, [0.9,0,0], 1)'],
		['color(srgb-linear 0 1 .5)', 'ColorPlus(srgb-linear, [0,1,0.5], 1)'],
		['color(srgb-linear 0 100% 50%)', 'ColorPlus(srgb-linear, [0,1,0.5], 1)'],
		['color(xyz 0 1 .5)', 'ColorPlus(xyz-d65, [0,1,0.5], 1)'],
		['color(xyz 0 100% 50%)', 'ColorPlus(xyz-d65, [0,1,0.5], 1)'],
		['color(xyz-d50 0 1 .5)', 'ColorPlus(xyz-d50, [0,1,0.5], 1)'],
		['color(xyz-d50 0 100% 50%)', 'ColorPlus(xyz-d50, [0,1,0.5], 1)'],
		['color(xyz-d65 0 1 .5)', 'ColorPlus(xyz-d65, [0,1,0.5], 1)'],
		['color(xyz-d65 0 100% 50%)', 'ColorPlus(xyz-d65, [0,1,0.5], 1)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses named function colors correctly', () => {
	const tests = [
		['hsl(-180,50%,50%)', 'ColorPlus(hsl, [-180,50,50], 1)'],
		['hsl(0.25turn 0% 0% / .5)', 'ColorPlus(hsl, [90,0,0], 0.5)'],
		['hsl(1.5707963267948966rad 0% 0% / .5)', 'ColorPlus(hsl, [90,0,0], 0.5)'],
		['hsl(100grad 0% 0% / .5)', 'ColorPlus(hsl, [90,0,0], 0.5)'],
		['hsl(180,50%,50%)', 'ColorPlus(hsl, [180,50,50], 1)'],
		['hsl(230.6 179.7% 37.56% / 1)', 'ColorPlus(hsl, [230.6,179.7,37.56], 1)'],
		['hsl(900,50%,50%)', 'ColorPlus(hsl, [900,50,50], 1)'],
		['hsl(90deg 0% 0% / .5)', 'ColorPlus(hsl, [90,0,0], 0.5)'],
		['hsl(none,50%,50%)', 'ColorPlus(hsl, [none,50,50], 1)'],
		['hsla(0,0%,100%,.5)', 'ColorPlus(hsl, [0,0,100], 0.5)'],
		['hwb(180 20 30)', 'ColorPlus(hwb, [180,20,30], 1)'],
		['hwb(180 20% 30%)', 'ColorPlus(hwb, [180,20,30], 1)'],
		['hwb(none 20% 30%)', 'ColorPlus(hwb, [none,20,30], 1)'],
		['lab(100 -50 5 / .5)', 'ColorPlus(lab, [100,-50,5], 0.5)'],
		['lab(100 -50 50)', 'ColorPlus(lab, [100,-50,50], 1)'],
		['lab(100% 0 0)', 'ColorPlus(lab, [100,0,0], 1)'],
		['Lab(100% 0 0)', 'ColorPlus(lab, [100,0,0], 1)'],
		['lab(50% 25% -25% / 50%)', 'ColorPlus(lab, [50,31.25,-31.25], 0.5)'],
		['lab(80 0 0)', 'ColorPlus(lab, [80,0,0], 1)'],
		['lch(100 50 450)', 'ColorPlus(lch, [100,50,450], 1)'],
		['lch(100 50 50)', 'ColorPlus(lch, [100,50,50], 1)'],
		['lch(100% 0 0)', 'ColorPlus(lch, [100,0,0], 1)'],
		['lch(50% 50% 50 / 50%)', 'ColorPlus(lch, [50,75,50], 0.5)'],
		['lch(90 0 none)', 'ColorPlus(lch, [90,0,none], 1)'],
		['lch(calc(NaN) 10 50)', 'ColorPlus(lch, [NaN,10,50], 1)'],
		['lch(NaN 10 50)', 'ColorPlus(lch, [NaN,10,50], 1)'],
		['oklab(1 -0.20 0.20)', 'ColorPlus(oklab, [1,-0.2,0.2], 1)'],
		['oklab(10 -0.80 0.80)', 'ColorPlus(oklab, [10,-0.8,0.8], 1)'],
		['oklab(100% 0 0 / 0.5)', 'ColorPlus(oklab, [1,0,0], 0.5)'],
		['oklab(100% 0 0)', 'ColorPlus(oklab, [1,0,0], 1)'],
		['OKLab(100% 0 0)', 'ColorPlus(oklab, [1,0,0], 1)'],
		['oklab(42% 100% -50%)', 'ColorPlus(oklab, [0.42,0.4,-0.2], 1)'],
		['oklch(1 0  120 / none)', 'ColorPlus(oklch, [1,0,120], 1)'],
		['oklch(1 0 none)', 'ColorPlus(oklch, [1,0,none], 1)'],
		['oklch(1 0.2 50)', 'ColorPlus(oklch, [1,0.2,50], 1)'],
		['oklch(10 2 500 / 10)', 'ColorPlus(oklch, [10,2,500], 1)'],
		['oklch(100% 0 0 / 50%)', 'ColorPlus(oklch, [1,0,0], 0.5)'],
		['oklch(100% 0 0)', 'ColorPlus(oklch, [1,0,0], 1)'],
		['OKLch(100% 0 0)', 'ColorPlus(oklch, [1,0,0], 1)'],
		['oklch(100% 0 30deg)', 'ColorPlus(oklch, [1,0,30], 1)'],
		['oklch(100% 150% 50)', 'ColorPlus(oklch, [1,0.6,50], 1)'],
		['oklch(100% 50% 50)', 'ColorPlus(oklch, [1,0.2,50], 1)'],
		['rgb(0 127.5 300 / .5)', 'ColorPlus(srgb, [0,0.5,1.1765], 0.5)'],
		['rgba(0,127.5,300,0.5)', 'ColorPlus(srgb, [0,0.5,1.1765], 0.5)'],
		['rgba(0% 50% 200% / 0.5)', 'ColorPlus(srgb, [0,0.5,2], 0.5)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});

it('parses legacy hsl values correctly', () => {
	// TODO tests for 0x-prefixed strings
	const tests = [
		// TODO tests for legacy hsl values
		['hsl(180 24 25)', 'ColorPlus(hsl, [180,24,25], 1)'],
		['hsl(180, 24, 25)', 'ColorPlus(hsl, [180,24,25], 1)'],
		['hsla(180, 24, 25, 0.5)', 'ColorPlus(hsl, [180,24,25], 0.5)'],
		['hsla(180 24 25 / 0.5)', 'ColorPlus(hsl, [180,24,25], 0.5)'],
	];

	tests.forEach(([input, expected]) => {
		expect(ColorPlus.create(input)?.toString()).toEqual(expected);
	});
});
