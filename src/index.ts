import {TpPlugin} from '@tweakpane/core';

import {type ColorPlusInputParams, ColorPlusInputPlugin} from './plugin.js';

// The identifier of the plugin bundle
export const id = 'color-plus';

// Replaced by Rollup with compiled SASS
export const css = '__css__';

// Re-export the parameter types
export type {ColorPlusInputParams};

// Export plugins array with explicit typing
export const plugins: TpPlugin[] = [ColorPlusInputPlugin];
