import { inGamut as colorJsInGamut } from 'colorjs.io/fn'
import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus.js'
import { clampColorToGamut } from '../src/utilities.js'

it('converts to a simple string', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	expect(c?.toString()).toBe('ColorPlus(srgb, [1,0,0], 1)')
})

it('converts to simple json', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	expect(c!.toJSON()).toEqual({
		alpha: 1,
		coords: [1, 0, 0],
		spaceId: 'srgb',
	})
})

it('sets and reads alpha without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	expect(c!.alpha).toBe(1)
	c!.alpha = 0.5
	expect(c!.alpha).toBe(0.5)

	expect(id).toBe(getObjectId(c!))
})

it('gets individual properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)

	expect(c!.get('h', 'oklch')).toBe(29.23388027962784)
	expect(id).toBe(getObjectId(c!))
})

it('gets all channels in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)

	expect(c!.getAll('oklch')).toEqual([0.6279553639214311, 0.2576833038053608, 29.23388027962784])
	expect(id).toBe(getObjectId(c!))
})

it('sets individual properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.set('h', 29.23388027962784, 'oklch')
	expect(c!.getAll()).toEqual([0.9999999999999997, 3.619639310503686e-15, -4.4825254619240695e-17])
	expect(id).toBe(getObjectId(c!))
})

it('sets all properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.setAll([45, 0.5, 0.5], 'oklch')
	expect(c!.getAll()).toEqual([126.18837298313176, 121.61659443932726, 122.73701128142706])
	expect(id).toBe(getObjectId(c!))
})

it('converts to other color spaces in-place', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.convert('oklch')
	expect(c!.getAll()).toEqual([0.6279553639214311, 0.2576833038053608, 29.23388027962784])
	expect(id).toBe(getObjectId(c!))
})

it('clones the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	const c2 = c!.clone()
	expect(c2.equals(c!)).toBe(true)
	expect(id).not.toBe(getObjectId(c2))
})

function getObjectId(object: unknown): symbol {
	// eslint-disable-next-line ts/naming-convention
	type ObjectWithId = { __id?: symbol }

	const localObject = object as ObjectWithId
	localObject.__id ??= Symbol(Date.now().toString())
	return localObject.__id
}

it('clamps a color into the widest configured gamut by shedding chroma', () => {
	const c = ColorPlus.create('oklch(65% 0.4 13)')
	expect(c).toBeDefined()
	expect(clampColorToGamut(c!, ['srgb', 'p3', 'rec2020'])).toBe(true)
	const [l, chroma, h] = c!.getAll('oklch')
	expect(l).toBeCloseTo(0.65, 10)
	expect(h).toBeCloseTo(13, 10)
	expect(chroma).toBeLessThan(0.4)
	expect(chroma).toBeGreaterThan(0)

	// An in-gamut color is left untouched.
	const inGamut = ColorPlus.create('oklch(65% 0.1 13)')
	expect(inGamut).toBeDefined()
	expect(clampColorToGamut(inGamut!, ['srgb'])).toBe(false)
	expect(inGamut!.getAll('oklch')[1]).toBeCloseTo(0.1, 10)
})

it('reports its color space', () => {
	const c = ColorPlus.create('#f00')!
	expect(c.space).toBe('srgb')
	c.convert('oklch')
	expect(c.space).toBe('oklch')
})

it('sets alpha through set(), constrained to [0, 1]', () => {
	const c = ColorPlus.create('#f00')!
	c.set('alpha', 0.25)
	expect(c.alpha).toBe(0.25)
	c.set('alpha', (alpha) => alpha * 2)
	expect(c.alpha).toBe(0.5)
	c.set('alpha', 3)
	expect(c.alpha).toBe(1)
	c.alpha = -1
	expect(c.alpha).toBe(0)
})

it('maps into another gamut and returns to its own space', () => {
	const c = ColorPlus.create('oklch(65% 0.4 13)')!
	expect(colorJsInGamut(c.toJSON(), 'srgb')).toBe(false)

	c.toGamut('srgb')
	expect(c.space).toBe('oklch')
	expect(colorJsInGamut(c.toJSON(), 'srgb')).toBe(true)
	const [, chroma] = c.getAll()
	expect(chroma).toBeLessThan(0.4)
	expect(chroma).toBeGreaterThan(0)
})

it('maps into its own gamut with the css or clip method', () => {
	const css = ColorPlus.create('rgb(300 -20 102)')!
	css.toGamut()
	expect(css.space).toBe('srgb')
	for (const channel of css.getAll()) {
		expect(channel).toBeGreaterThanOrEqual(-1e-9)
		expect(channel).toBeLessThanOrEqual(1 + 1e-9)
	}

	const clip = ColorPlus.create('rgb(300 -20 102)')!
	clip.toGamut(undefined, 'clip')
	const [r, g, b] = clip.getAll()
	expect(r).toBe(1)
	expect(g).toBe(0)
	expect(b).toBeCloseTo(0.4, 10)

	// The css method sheds chroma instead of clipping channels
	expect(css.getAll()[1]).toBeGreaterThan(0.1)
})

it('gets and sets channels in its own space by default', () => {
	const c = ColorPlus.create('#f00')!
	expect(c.get('r')).toBe(1)
	expect(c.get('g')).toBe(0)

	c.set('g', 0.5)
	expect(c.getAll()).toEqual([1, 0.5, 0])

	c.set('b', (b) => b + 0.25)
	expect(c.getAll()).toEqual([1, 0.5, 0.25])

	c.setAll([0, 0.5, 1])
	expect(c.getAll()).toEqual([0, 0.5, 1])
	expect(c.space).toBe('srgb')
})
