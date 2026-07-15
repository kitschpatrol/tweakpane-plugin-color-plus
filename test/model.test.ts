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
