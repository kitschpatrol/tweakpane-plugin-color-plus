import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite';

const params = {
	stringColorHex: '#ff00ff',
	stringColorHexAlpha: '#ff00ffcc',
	stringColorOklch: 'oklch(66.62% 0.296 2.47deg)',
	stringColorOklchAlpha: 'oklch(66.62% 0.296 2.47deg / 50%)',
	numberColor: 0xff00ff,
	numberColorAlpha: 0xff00ffcc,
	objectColor: {
		r: 255,
		g: 0,
		b: 255,
	},
	objectColorAlpha: {
		r: 255,
		g: 0,
		b: 255,
		a: 0.5,
	},
};

const pane = new Pane();
pane.registerPlugin(TweakpanePluginColorPlus);

// Tweakpane Classic Color
pane.addBinding(params, 'stringColorHex', {
	picker: 'inline',
	expanded: true,
});
pane.addBinding(params, 'stringColorHexAlpha');
pane.addBinding(params, 'numberColor', {view: 'color'});
pane.addBinding(params, 'numberColorAlpha', {
	view: 'color',
	color: {alpha: true},
});
pane.addBinding(params, 'objectColor');
pane.addBinding(params, 'objectColorAlpha');

// Tweakpane Color Plus
pane.addBlade({
	view: 'separator',
});

pane.addBinding(params, 'stringColorHex', {
	view: 'color-plus',
	picker: 'inline',
	expanded: true,
});

// pane.addBinding(params, 'stringColorHex', {
// 	view: 'color-plus',
// 	color: {alpha: 'always'},
// });

// pane.addBinding(params, 'stringColorHexAlpha', {view: 'color-plus'});
// pane.addBinding(params, 'stringColorOklch', {view: 'color-plus'});
// pane.addBinding(params, 'stringColorOklchAlpha', {view: 'color-plus'});
// pane.addBinding(params, 'numberColor', {view: 'color-plus'});
// pane.addBinding(params, 'numberColorAlpha', {view: 'color-plus'});

pane.on('change', () => {
	pane.refresh();
});

// function refresh() {
// 	pane.refresh();
// 	requestAnimationFrame(refresh);
// }
// refresh();
