import type { TpPlugin } from '@tweakpane/core'
import { ColorPlusInputPlugin } from './plugin.js'

// The identifier of the plugin bundle
export const id = 'color-plus'

// Replaced by Rollup with compiled SASS
export const css = '__css__'

// Re-export the parameter types

// Export plugins array with explicit typing
export const plugins: TpPlugin[] = [ColorPlusInputPlugin]

// Exposed for working with color values outside of the plugin
// E.g. used by svelte-tweakpane-ui for CLS placeholder calculation
export { ColorPlus as ColorPlusModel } from './model/color-plus.js'

export { type ColorPlusInputParams, type ColorPlusValue } from './plugin.js'
