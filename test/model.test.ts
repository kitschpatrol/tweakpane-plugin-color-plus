import { expect, it } from 'vitest'
import { ColorPlus } from '../src/model/color-plus.js'

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

	expect(c!.get('h', 'oklch')).toBe(29.233_880_279_627_84)
	expect(id).toBe(getObjectId(c!))
})

it('gets all channels in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)

	expect(c!.getAll('oklch')).toEqual([
		0.627_955_363_921_431_1, 0.257_683_303_805_360_8, 29.233_880_279_627_84,
	])
	expect(id).toBe(getObjectId(c!))
})

it('sets individual properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.set('h', 29.233_880_279_627_84, 'oklch')
	expect(c!.getAll()).toEqual(
		[
		  0.999_999_999_999_999_7,
		  3.619_639_310_503_686e-15,
		  -4.482_525_461_924_069_5e-17,
		]
	)
	expect(id).toBe(getObjectId(c!))
})

it('sets all properties in any color space without mutating the object', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.setAll([45, 0.5, 0.5], 'oklch')
	expect(c!.getAll()).toEqual(
		[
		  126.188_372_983_131_76,
		  121.616_594_439_327_26,
		  122.737_011_281_427_06,
		]
	)
	expect(id).toBe(getObjectId(c!))
})

it('converts to other color spaces in-place', () => {
	const c = ColorPlus.create('#f00')
	expect(c).toBeDefined()
	const id = getObjectId(c!)
	c!.convert('oklch')
	expect(c!.getAll()).toEqual([
		0.627_955_363_921_431_1, 0.257_683_303_805_360_8, 29.233_880_279_627_84,
	])
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
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	const localObject = object as ObjectWithId
	localObject.__id ??= Symbol(Date.now().toString())
	return localObject.__id
}
