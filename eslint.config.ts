import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig(
	{
		rules: {
			// The default autofix adds the ES2024 `v` flag, beyond the ES2022 browser build target
			'require-unicode-regexp': ['error', { requireFlag: 'u' }],
		},
		ts: {
			overrides: {
				'jsdoc/require-jsdoc': 'off',
				'new-cap': 'off',
				'ts/no-restricted-types': 'off',
				'ts/unbound-method': 'off',
				'unicorn/no-null': 'off',
			},
		},
		type: 'lib',
	},

	{
		files: ['readme.md/*.ts'],
		rules: {
			'capitalized-comments': 'off',
			'perfectionist/sort-objects': 'off',
		},
	},
)
