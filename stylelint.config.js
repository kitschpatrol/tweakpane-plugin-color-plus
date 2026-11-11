import { stylelintConfig } from '@kitschpatrol/stylelint-config'

export default stylelintConfig({
	overrides: [
		{
			extends: ['stylelint-config-standard-scss'],
			files: ['**/*.scss'],
		},
	],
})
