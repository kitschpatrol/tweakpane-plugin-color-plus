import {expect, it} from 'vitest';

import {ColorPlus} from '../src/model/color-plus.js';

it('converts to a simple string', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	expect(c?.toString()).toBe('ColorPlus(srgb, [1,0,0], 1)');
});

it('converts to simple json', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	expect(c!.toJSON()).toEqual({
		spaceId: 'srgb',
		coords: [1, 0, 0],
		alpha: 1,
	});
});

it('sets and reads alpha without mutating the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);
	expect(c!.alpha).toBe(1);
	c!.alpha = 0.5;
	expect(c!.alpha).toBe(0.5);

	expect(id).toBe(getObjectId(c));
});

it('gets individual properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);

	expect(c!.get('h', 'oklch', 4)).toBe(29.23);
	expect(id).toBe(getObjectId(c));
});

it('gets all channels in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);

	expect(c!.getAll('oklch', 4)).toEqual([0.628, 0.2577, 29.23]);
	expect(id).toBe(getObjectId(c));
});

it('sets individual properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);
	c!.set('h', 29.23388027962784, 'oklch');
	expect(c!.getAll(undefined, 4)).toEqual([1, 0, 0]);
	expect(id).toBe(getObjectId(c));
});

it('sets all properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);
	c!.setAll([45, 0.5, 0.5], 'oklch');
	expect(c!.getAll(undefined, 4)).toEqual([126.2, 121.6, 122.7]);
	expect(id).toBe(getObjectId(c));
});

it('converts to other color spaces in-place', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);
	c!.convert('oklch');
	expect(c!.getAll(undefined, 4)).toEqual([0.628, 0.2577, 29.23]);
	expect(id).toBe(getObjectId(c));
});

it('clones the object', () => {
	const c = ColorPlus.create('#f00');
	expect(c).toBeDefined();
	const id = getObjectId(c);
	const c2 = c!.clone();
	expect(c2.equals(c!)).toBe(true);
	expect(id).not.toBe(getObjectId(c2));
});

function getObjectId(obj: any): symbol {
	if (!('__id' in obj)) {
		obj.__id = Symbol(Date.now().toString());
	}

	return obj.__id;
}
