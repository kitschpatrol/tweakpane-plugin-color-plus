import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus';

const params = {
	color: 'oklch(65% 0.26 357deg)',
};

const pane = new Pane();

pane.registerPlugin(TweakpanePluginColorPlus);

pane.addBinding(params, 'color', {view: 'color-plus'});

pane.on('change', () => {
	document.documentElement.style.backgroundColor = params['color'];
});
