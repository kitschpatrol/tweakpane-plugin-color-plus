/* eslint-disable perfectionist/sort-objects */
/* @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,
	extends: ['@kitschpatrol/eslint-config'],
	// Overrides
	rules: {
		'unicorn/no-null': 'off',
		'new-cap': 'off',
		'@typescript-eslint/member-ordering': 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/unbound-method': 'off',
	},
}
