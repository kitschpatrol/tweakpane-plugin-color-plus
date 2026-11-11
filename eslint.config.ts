import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig(
	{
		// Chagent generates the changelog.
		ignores: ['**/changelog.md'],
		type: 'lib',
	},
	{
		// Keep automatic syntax fixes within the browser build target.
		languageOptions: { ecmaVersion: 2022 },
		rules: {
			// These fixes use ES2023's toReversed, toSorted, and toSpliced.
			'e18e/prefer-array-to-reversed': 'off',
			'e18e/prefer-array-to-sorted': 'off',
			'e18e/prefer-array-to-spliced': 'off',
			// The default fix adds ES2024's v flag.
			'require-unicode-regexp': ['error', { requireFlag: 'u' }],
			// These fixes use ES2023's toReversed and toSorted.
			'unicorn/no-array-reverse': 'off',
			'unicorn/no-array-sort': 'off',
		},
	},
	{
		// Tweakpane's plugin APIs use null sentinels, the ClassName() factory, and methods bound in constructors.
		files: ['src/**/*.ts', 'test/**/*.ts'],
		rules: {
			'new-cap': ['error', { capIsNewExceptions: ['ClassName'] }],
			'ts/no-restricted-types': 'off',
			'ts/unbound-method': 'off',
			'unicorn/no-null': 'off',
		},
	},
	{
		// Readme examples list options in documentation order.
		files: ['readme.md/*.ts'],
		rules: {
			'capitalized-comments': 'off',
			'perfectionist/sort-objects': 'off',
		},
	},
)
