import { knipConfig } from '@kitschpatrol/knip-config'

export default knipConfig({
	entry: [
		'demo/example/index.ts',
		'demo/npm/index.js',
		'demo/playground/index.ts',
		'demo/screenshot/index.ts',
		'src/scratch.ts',
	],
	ignore: ['src/sass/plugin.scss'],
})
