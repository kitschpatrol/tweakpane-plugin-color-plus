// Import both the plugins and their types
import {
	type NumberColorPlusInputParams,
	NumberColorPlusInputPlugin,
} from './plugin-number.js';
import {
	type ObjectColorPlusInputParams,
	ObjectColorPlusInputPlugin,
} from './plugin-object.js';
import {
	type StringColorPlusInputParams,
	StringColorPlusInputPlugin,
} from './plugin-string.js';

// The identifier of the plugin bundle
export const id = 'color-plus';

// CSS injection
export const css = '__css__';

// Re-export the parameter types
export type {
	NumberColorPlusInputParams,
	ObjectColorPlusInputParams,
	StringColorPlusInputParams,
};

// Export plugins array with explicit typing
export const plugins = [
	NumberColorPlusInputPlugin,
	StringColorPlusInputPlugin,
	ObjectColorPlusInputPlugin,
] as const;
