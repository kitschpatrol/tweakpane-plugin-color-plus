import {Pane} from 'tweakpane';
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite';

const params = {
	view: 'color-plus',
	color: 'oklch(65% 0.26 357deg)',
	color1: 'rgb(50%, 100%, 20%)',
	color2: 'rgb(255, 0, 128)',
	color3: 'rgba(100 150 12 / .50)',
	color4: 'hsl(180, 50%, 50%)',
	color5: 'hsl(180, 24, 25)',
	color6: 'hsl(180 24 25)',
};

const pane = new Pane();
pane.registerPlugin(TweakpanePluginColorPlus);
// pane.addBinding(params, 'color', {view: 'color-plus'});
// pane.addBinding(params, 'color1', {view: 'color-plus'});
// pane.addBinding(params, 'color2', {view: 'color-plus'});
// pane.addBinding(params, 'color3', {view: 'color-plus'});
pane.addBinding(params, 'color4', {view: 'color-plus'});
// pane.addBinding(params, 'color5', {view: 'color-plus'});
// pane.addBinding(params, 'color6', {view: 'color-plus'});
