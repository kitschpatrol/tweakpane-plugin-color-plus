/* eslint-disable perfectionist/sort-objects */
/* @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,
	extends: ['@kitschpatrol/eslint-config'],
	// Overrides
	rules: {
		'unicorn/no-null': 'off',
		'new-cap': 'off',
	},
}
