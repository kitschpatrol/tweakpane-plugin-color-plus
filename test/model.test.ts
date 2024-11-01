import {expect, it} from 'vitest';

import {ColorPlus} from '../src/model/color-plus.js';

it('toString', () => {
	const c = ColorPlus.create('#f00');
	expect(c?.toString()).toBe('ColorPlus(srgb, [1,0,0], 1)');
});
