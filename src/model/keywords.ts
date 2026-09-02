/*
 * Reverse lookup from colors to CSS named colors ("keywords"). Colorjs ships
 * its keyword format parse-only; this module supplies the missing serializer
 * half: the perceptually-nearest named color by Euclidean distance in OKLab
 * (equivalent to deltaEOK, without pulling in the deltaE module chain). The
 * same lookup drives the quantized picker plane for named-color bindings.
 *
 * Imports deliberately avoid ./shared (which imports this module to attach the
 * serializer); the lookup table is built lazily so the color space
 * registrations in ./shared always run first.
 */
import type { Coords } from 'colorjs.io/fn'
import { to as colorJsConvert } from 'colorjs.io/fn'
import keywords from 'colorjs.io/src/keywords.js'

type KeywordEntry = {
	lab: [number, number, number]
	name: string
	oklch: [number, number, number]
}

let lut: KeywordEntry[] | undefined

const finite = (value: null | number | undefined): number =>
	value === null || value === undefined || Number.isNaN(value) ? 0 : value

function keywordLut(): KeywordEntry[] {
	if (lut === undefined) {
		lut = []
		for (const [name, coords] of Object.entries(keywords)) {
			const color = { alpha: 1, coords: [...coords] as Coords, spaceId: 'srgb' }
			const lab = colorJsConvert(color, 'oklab').coords
			const lch = colorJsConvert(color, 'oklch').coords
			lut.push({
				lab: [finite(lab[0]), finite(lab[1]), finite(lab[2])],
				name,
				// Achromatic keywords have no oklch hue; coerce to 0 for the raster path
				oklch: [finite(lch[0]), finite(lch[1]), finite(lch[2])],
			})
		}
	}

	return lut
}

// Strict < over insertion order makes ties deterministic: the first-listed
// name in the CSS named-color table wins (aqua over cyan, fuchsia over
// magenta, gray over grey)
function nearestEntry(l: number, a: number, b: number): KeywordEntry {
	const entries = keywordLut()
	let best = entries[0]!
	let bestDistance = Infinity
	for (const entry of entries) {
		const dl = entry.lab[0] - l
		const da = entry.lab[1] - a
		const db = entry.lab[2] - b
		const distance = dl * dl + da * da + db * db
		if (distance < bestDistance) {
			best = entry
			bestDistance = distance
			if (distance === 0) {
				break
			}
		}
	}

	return best
}

/**
 * The OKLCH coordinates of the CSS named color nearest to the given OKLCH
 * color. Drives the quantized picker plane for named-color bindings. Returns a
 * shared tuple — read, don't mutate.
 */
export function nearestKeywordOklch(l: number, c: number, h: number): [number, number, number] {
	const hueRadians = (finite(h) * Math.PI) / 180
	return nearestEntry(finite(l), finite(c) * Math.cos(hueRadians), finite(c) * Math.sin(hueRadians))
		.oklch
}

type KeywordSerializeOptions = {
	alpha?: boolean | undefined | { include?: boolean | undefined; type?: string | undefined }
}

/**
 * Serializer for colorjs's parse-only `keyword` format: the nearest CSS named
 * color, or `transparent` for a fully transparent color when alpha is included
 * (exactly 0 — translucency isn't representable and is ignored). Attached to
 * the sRGB space's keyword format in ./shared.
 */
export function serializeKeyword(
	coords: Coords,
	alpha: number,
	options?: KeywordSerializeOptions,
): string {
	const alphaOption = options?.alpha
	const hasAlpha = (typeof alphaOption === 'object' ? alphaOption.include : alphaOption) !== false
	if (hasAlpha && alpha === 0) {
		return 'transparent'
	}

	const lab = colorJsConvert({ alpha: 1, coords, spaceId: 'srgb' }, 'oklab').coords
	return nearestEntry(finite(lab[0]), finite(lab[1]), finite(lab[2])).name
}
