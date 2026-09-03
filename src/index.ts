import type { TpPlugin } from '@tweakpane/core'
import { ColorPlusInputPlugin } from './plugin.js'

// The identifier of the plugin bundle
export const id = 'color-plus'

// Replaced at build time with the compiled stylesheet (see tsdown.config.ts)
export const css = '__css__'

// Export plugins array with explicit typing
export const plugins: TpPlugin[] = [ColorPlusInputPlugin]

// Exposed for working with color values outside of the plugin
// E.g. used by svelte-tweakpane-ui for CLS placeholder calculation
export { ColorPlus as ColorPlusModel } from './model/color-plus.js'

export type {
	ColorPlusGamutLines,
	ColorPlusInputParams,
	ColorPlusPaletteChannels,
	ColorPlusPaletteProjection,
	ColorPlusSwatchFallback,
	ColorPlusType,
	ColorPlusValue,
	ColorPlusValueNumber,
	ColorPlusValueObject,
	ColorPlusValueRgbaTuple,
	ColorPlusValueRgbTuple,
	ColorPlusValueString,
	ColorPlusValueTuple,
} from './plugin.js'
