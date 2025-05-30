import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig(
	{
		html: {
			overrides: {
				'html/use-baseline': 'off',
			},
		},
		ignores: ['/src/sass/plugin.scss'],
		ts: {
			overrides: {
				// Knip workaround...
				// https://github.com/webpro-nl/knip/issues/158#issuecomment-1632648598
				'jsdoc/check-tag-names': ['error', { definedTags: ['public'] }],
				'jsdoc/require-jsdoc': 'off',
				'new-cap': 'off',
				'ts/member-ordering': 'off',
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
