import type { TpPlugin } from '@tweakpane/core'
import { ColorPlusInputPlugin } from './plugin.js'

// The identifier of the plugin bundle
export const id = 'color-plus'

// Replaced by Rollup with compiled SASS
export const css = '__css__'

// Re-export the parameter types

// Export plugins array with explicit typing
export const plugins: TpPlugin[] = [ColorPlusInputPlugin]

export { type ColorPlusInputParams, type ColorPlusValue } from './plugin.js'
