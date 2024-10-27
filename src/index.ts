// Import both the plugins and their types
import {type ColorPlusInputParams, ColorPlusInputPlugin} from './plugin.js';

// The identifier of the plugin bundle
export const id = 'color-plus';

// CSS injection
export const css = '__css__';

// Re-export the parameter types
export type {ColorPlusInputParams};

// Export plugins array with explicit typing
export const plugins = [ColorPlusInputPlugin] as const;
