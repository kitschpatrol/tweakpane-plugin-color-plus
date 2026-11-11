import { knipConfig } from '@kitschpatrol/knip-config'

export default knipConfig({
	entry: [
		'demo/example/index.ts',
		'demo/npm/index.js',
		'demo/playground/index.ts',
		'demo/screenshot/index.ts',
		// An intentional scratch workspace for trying the model API.
		'src/scratch.ts',
	],
	ignoreDependencies: [
		'@kitschpatrol/chagent', // Invoked through bumpp's --execute argument.
		'@tsdown/css', // Discovered by tsdown when CSS imports are present.
		'stylelint-config-standard-scss', // Loaded through the shared Stylelint configuration factory.
	],
})
