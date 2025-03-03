import { remarkConfig } from '@kitschpatrol/remark-config'

export default remarkConfig({
	rules: [
		// ['remark-lint-first-heading-level', 2],
		['remarkValidateLinks', { repository: false }],
		['remark-lint-no-duplicate-headings', false],
	],
})
