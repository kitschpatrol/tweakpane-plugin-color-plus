import type { TpPlugin } from '@tweakpane/core'
import { ColorPlusInputPlugin } from './plugin'
import pluginCss from './styles/plugin.scss?inline'

// The identifier of the plugin bundle
export const id = 'color-plus'

// Tweakpane installs this compiled stylesheet when the bundle is registered.
export const css: string = pluginCss

// Export plugins array with explicit typing
export const plugins: TpPlugin[] = [ColorPlusInputPlugin]

// Exposed for working with color values outside of the plugin
// E.g. used by svelte-tweakpane-ui for CLS placeholder calculation
export { ColorPlus as ColorPlusModel } from './model/color-plus'

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
} from './plugin'
