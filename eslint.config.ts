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
			// Tweakpane uses ClassName() factory
			'new-cap': ['error', { capIsNewExceptions: ['ClassName'] }],
			// The default fix adds ES2024's v flag.
			'require-unicode-regexp': ['error', { requireFlag: 'u' }],
			// Tweakpane uses null sentinels
			'ts/no-restricted-types': 'off',
			// Tweakpane binds methods in constructors
			'ts/unbound-method': 'off',
			// These fixes use ES2023's toReversed and toSorted.
			'unicorn/no-array-reverse': 'off',
			'unicorn/no-array-sort': 'off',
			// Tweakpane uses null sentinels
			'unicorn/no-null': 'off',
		},
	},
	{
		// Readme examples list options in documentation order.
		files: ['readme.md/*.{js,ts}'],
		rules: {
			'capitalized-comments': 'off',
			'import/no-unresolved': 'off',
			'perfectionist/sort-objects': 'off',
		},
	},
)
