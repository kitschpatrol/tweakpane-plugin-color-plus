import sharedConfig from '@kitschpatrol/prettier-config'

/** @type {import("prettier").Config} */
const localConfig = {
	overrides: [
		...sharedConfig.overrides,
		{
			files: '*.scss',
			options: {
				parser: 'scss',
			},
		},
	],
}

export default {
	...sharedConfig,
	...localConfig,
}
