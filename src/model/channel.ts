/*
 * Channel/axis model for the OKLCH picker.
 *
 * Each layout assigns the three OKLCH channels — lightness, chroma, hue — to
 * three roles: the plane's X axis, the plane's Y axis, and the off-plane slider.
 * `PlaneLayout` names a layout as `[X][Y]_[slider]` (e.g. `LC_H` = lightness on
 * X, chroma on Y, hue on the slider). The helpers here convert between channel
 * values and normalized screen positions so the view and controller can reason
 * in terms of roles instead of hard-coding lightness vs chroma.
 */

/** One OKLCH channel: lightness, chroma, or hue. */
export type Channel = 'c' | 'h' | 'l'

/** A plane screen axis. */
export type Axis = 'x' | 'y'

/**
 * A layout, named `[X][Y]_[slider]`. The two plane axes and the off-plane
 * slider channel are always a permutation of lightness, chroma, and hue.
 */
export type PlaneLayout = 'CH_L' | 'CL_H' | 'HC_L' | 'HL_C' | 'LC_H' | 'LH_C'

/**
 * How the picker plane projects the gamut volume onto its rectangle:
 * 'perceptual' paints absolute OKLCH positions (the gamut sits as an irregular
 * region), 'stretch' normalizes the widest gamut's in-gamut band to fill the
 * plane row by row, and 'okhsv' additionally uses an OKHSV saturation/value
 * projection on lightness×chroma layouts (the vivid cusp lands in a corner),
 * falling back to 'stretch' behavior on the other layouts.
 */
export type PaletteProjection = 'okhsv' | 'perceptual' | 'stretch'

/** The channel assigned to each role for a given layout. */
export type LayoutRoles = {
	slider: Channel
	x: Channel
	y: Channel
}

/** Channel role assignment for every layout. */
/* eslint-disable ts/naming-convention -- layout ids are upper-case [X][Y]_[slider] tokens */
export const LAYOUTS: Record<PlaneLayout, LayoutRoles> = {
	CH_L: { slider: 'l', x: 'c', y: 'h' },
	CL_H: { slider: 'h', x: 'c', y: 'l' },
	HC_L: { slider: 'l', x: 'h', y: 'c' },
	HL_C: { slider: 'c', x: 'h', y: 'l' },
	LC_H: { slider: 'h', x: 'l', y: 'c' },
	LH_C: { slider: 'c', x: 'l', y: 'h' },
}
/* eslint-enable ts/naming-convention */

/** Every layout id, for option validation and demos. */
export const PLANE_LAYOUTS: PlaneLayout[] = ['LC_H', 'CL_H', 'LH_C', 'HL_C', 'HC_L', 'CH_L']

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

/**
 * Upper end of a channel's value range. Lightness is 0..1 and hue 0..360;
 * chroma has no intrinsic ceiling, so the widest configured gamut's global
 * maximum stands in.
 */
export function channelMax(channel: Channel, globalMaxChroma: number): number {
	if (channel === 'h') {
		return 360
	}

	if (channel === 'l') {
		return 1
	}

	return globalMaxChroma
}

/**
 * A channel value as a unit position (0 = low end, 1 = high end of its range).
 * Hue is clamped, not wrapped, so a value of 360 maps to the far end of the
 * axis rather than folding back to 0 — otherwise an axis that carries hue would
 * put a stray vertex at the wrong end when sampling its edge.
 */
export function valueToUnit(channel: Channel, value: number, globalMaxChroma: number): number {
	const max = channelMax(channel, globalMaxChroma)
	if (max <= 0) {
		return 0
	}

	return clamp01(value / max)
}

/** Inverse of `valueToUnit`: a unit position back to a channel value. */
export function unitToValue(channel: Channel, unit: number, globalMaxChroma: number): number {
	return clamp01(unit) * channelMax(channel, globalMaxChroma)
}

/** A unit position to a screen fraction on `axis` (Y is flipped). */
export function unitToAxisFraction(unit: number, axis: Axis): number {
	return axis === 'x' ? unit : 1 - unit
}

/** Inverse of `unitToAxisFraction`: a screen fraction back to a unit position. */
export function axisFractionToUnit(fraction: number, axis: Axis): number {
	return axis === 'x' ? fraction : 1 - fraction
}

/**
 * Convert a normalized plane position (top-left origin, both 0..1) plus the
 * fixed slider value into OKLCH coordinates, using each channel's absolute
 * range (perceptual mapping).
 */
export function positionToOklch(
	roles: LayoutRoles,
	xFraction: number,
	yFraction: number,
	sliderValue: number,
	globalMaxChroma: number,
): [number, number, number] {
	// The three roles are a permutation of c/h/l, so each computed key lands once.
	const values: Record<Channel, number> = {
		c: 0,
		h: 0,
		l: 0,
		[roles.slider]: sliderValue,
		[roles.x]: unitToValue(roles.x, axisFractionToUnit(xFraction, 'x'), globalMaxChroma),
		[roles.y]: unitToValue(roles.y, axisFractionToUnit(yFraction, 'y'), globalMaxChroma),
	}
	return [values.l, values.c, values.h]
}

/**
 * Which plane axis stretch normalizes, and which it iterates across. Chroma has
 * a single in-gamut band anchored at the achromatic axis, so it is preferred;
 * otherwise lightness (also a single band). Hue is never scanned — at a fixed
 * lightness and chroma the in-gamut hues can form several arcs.
 */
export type PlaneBand = {
	bandAxis: Axis
	bandChannel: Channel
	iterAxis: Axis
	iterChannel: Channel
}

/** Resolve the band vs iteration axes for a layout (see `PlaneBand`). */
export function planeBand(roles: LayoutRoles): PlaneBand {
	const bandChannel: Channel = roles.x === 'c' || roles.y === 'c' ? 'c' : 'l'
	if (roles.x === bandChannel) {
		return { bandAxis: 'x', bandChannel, iterAxis: 'y', iterChannel: roles.y }
	}

	return { bandAxis: 'y', bandChannel, iterAxis: 'x', iterChannel: roles.x }
}
