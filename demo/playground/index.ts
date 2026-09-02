/* eslint-disable perfectionist/sort-objects */

import { Pane } from 'tweakpane'
import * as TweakpanePluginColorPlus from 'tweakpane-plugin-color-plus/lite'

const { ColorPlusModel } = TweakpanePluginColorPlus

// Gamut ids, narrow → wide. Must match the colorjs ids the plugin accepts.
const GAMUT_IDS = ['srgb', 'a98rgb', 'p3', 'rec2020', 'prophoto'] as const

// Channel-to-axis assignments as [X][Y]_[slider].
const PALETTE_CHANNELS_IDS = ['LC_H', 'CL_H', 'LH_C', 'HL_C', 'HC_L', 'CH_L'] as const

const PALETTE_PROJECTION_IDS = ['perceptual', 'stretch', 'okhsv'] as const

const PALETTE_GAMUT_BOUNDARIES_IDS = ['inner', 'outer', 'all', 'none'] as const

// Bound-value format families. The format drives the plugin's adaptive
// defaults (gamuts, texts mode), the quantized named-color palette, and which
// color.* options apply (alpha is number-only, type is object/tuple-only).
const FORMAT_IDS = ['oklch', 'hex', 'named', 'number', 'object', 'tuple'] as const
type FormatId = (typeof FORMAT_IDS)[number]

const FORMAT_LABELS: Record<FormatId, string> = {
	oklch: 'oklch string',
	hex: 'hex string',
	named: 'named color',
	number: 'number',
	object: 'object',
	tuple: 'tuple',
}

// Formats whose bound values can carry int (0-255) or float (0-1) channels,
// selected by the color.type param
function hasTypeOption(format: FormatId): boolean {
	return format === 'object' || format === 'tuple'
}

// The grid opens with one cell per format, plus the float variants of the
// typed formats
const INITIAL_CELLS: ReadonlyArray<{ format: FormatId; type: 'float' | 'int' }> = [
	{ format: 'oklch', type: 'int' },
	{ format: 'hex', type: 'int' },
	{ format: 'named', type: 'int' },
	{ format: 'number', type: 'int' },
	{ format: 'object', type: 'int' },
	{ format: 'object', type: 'float' },
	{ format: 'tuple', type: 'int' },
	{ format: 'tuple', type: 'float' },
]

// Typed formats key their exemplars (and encodings) by format + type
type ExemplarKey = 'objectFloat' | 'tupleFloat' | FormatId

function exemplarKey(format: FormatId, type: 'float' | 'int'): ExemplarKey {
	if (type === 'float' && hasTypeOption(format)) {
		return format === 'object' ? 'objectFloat' : 'tupleFloat'
	}

	return format
}

// Exemplar values per format: they seed each picker's initial value, and their
// parsed formats drive re-encoding when the alpha toggle changes; the plugin
// then re-derives the format from the encoded value at bind time. Named
// strings can only express alpha as exactly 'transparent'.
const FORMAT_EXEMPLARS: Record<ExemplarKey, { alpha: unknown; opaque: unknown }> = {
	oklch: { opaque: 'oklch(0.65 0.2 13)', alpha: 'oklch(0.65 0.2 13 / 0.5)' },
	hex: { opaque: '#ff0066', alpha: '#ff00667f' },
	named: { opaque: 'red', alpha: 'transparent' },
	number: { opaque: 0xff_00_66, alpha: 0xff_00_66_7f },
	object: { opaque: { r: 255, g: 0, b: 102 }, alpha: { r: 255, g: 0, b: 102, a: 0.5 } },
	objectFloat: { opaque: { r: 1, g: 0, b: 0.4 }, alpha: { r: 1, g: 0, b: 0.4, a: 0.5 } },
	tuple: { opaque: [255, 0, 102], alpha: [255, 0, 102, 0.5] },
	tupleFloat: { opaque: [1, 0, 0.4], alpha: [1, 0, 0.4, 0.5] },
}

// Every adjustable picker option, one copy per picker; each cell's options
// pane edits its own copy and rebuilds just that picker (plugin options can't
// be changed in place). Each copy is seeded with the natural defaults the
// plugin would resolve for its format, so the options pane displays the real
// per-format values. Mirrors the plugin's adaptive defaults (src/utilities.ts):
// sRGB-bound models (hex, named, number, object, tuple) get a plain sRGB
// picker with no gamut label; wide models (oklch) get srgb + p3 and the label.
function createState(format: FormatId, type: 'float' | 'int' = 'int') {
	const isWide = format === 'oklch'
	return {
		format,
		type: hasTypeOption(format) ? type : 'int',
		paletteChannels: 'CL_H',
		paletteProjection: 'okhsv',
		gamutLines: 'inner',
		gamutLabel: isWide,
		constrain: true,
		formatLocked: true,
		textFields: true,
		swatchFallback: 'clip',
		alpha: false,
		expanded: true,
		picker: 'inline',
		srgb: true,
		a98rgb: false,
		p3: isWide,
		rec2020: false,
		prophoto: false,
	}
}

type PlaygroundState = ReturnType<typeof createState>

type PickerSlot = {
	binding: undefined | { dispose: () => void }
	cellElement: HTMLDivElement
	// How the slot's bound value was last encoded: float objects and
	// alpha-carrying numbers are ambiguous on their own, so re-parsing them on
	// the next rebuild needs the same flags they were written with
	encoding: { alpha: boolean; type: 'float' | 'int' }
	format: FormatId
	pane: Pane
	params: { color: unknown }
	state: PlaygroundState
}

const pickersElement = document.querySelector<HTMLDivElement>('div#pickers')!

// The most recently changed picker drives the page background
let activeSlot: PickerSlot | undefined

function createSlot(format: FormatId, type: 'float' | 'int'): PickerSlot {
	const cellElement = document.createElement('div')
	cellElement.classList.add('cell')
	pickersElement.append(cellElement)

	const pickerContainer = document.createElement('div')
	const optionsContainer = document.createElement('div')
	cellElement.append(pickerContainer, optionsContainer)

	const pane = new Pane({ container: pickerContainer, title: FORMAT_LABELS[format] })
	pane.registerPlugin(TweakpanePluginColorPlus)

	const slot: PickerSlot = {
		binding: undefined,
		cellElement,
		// Must match how the seeded exemplar is encoded, or the first rebuild
		// misreads it (float channels parsed as 0-255 ints read as near-black)
		encoding: { alpha: false, type: hasTypeOption(format) ? type : 'int' },
		format,
		pane,
		// Clone: the binding writer mutates bound objects and arrays in place,
		// and the exemplars must stay pristine for format derivation
		params: { color: structuredClone(FORMAT_EXEMPLARS[exemplarKey(format, type)].opaque) },
		state: createState(format, type),
	}

	// The first slot starts as the page-background driver
	activeSlot ??= slot

	pane.on('change', () => {
		activeSlot = slot
		updateCellBackground(slot)
	})

	const optionsPane = new Pane({
		container: optionsContainer,
		title: 'Options',
		expanded: false,
	})
	const { formatBinding, typeBinding } = addOptionControls(optionsPane, slot.state)
	typeBinding.disabled = !hasTypeOption(format)
	let isReseeding = false
	optionsPane.on('change', (event) => {
		if (isReseeding) {
			return
		}

		// A format switch re-seeds the other options to the new format's natural
		// defaults — matching a fresh binding of that type — before the rebuild
		// re-encodes the current color into the new format
		if (event.target === formatBinding) {
			slot.format = slot.state.format
			Object.assign(slot.state, createState(slot.format))
			isReseeding = true
			optionsPane.refresh()
			isReseeding = false
			typeBinding.disabled = !hasTypeOption(slot.format)
		}

		rebuildPicker(slot)
	})

	return slot
}

// Returns the format binding (so the change handler can tell a format switch,
// which re-seeds the other options, apart from a plain option tweak) and the
// type binding (enabled only for the object/tuple formats that honor it)
function addOptionControls(pane: Pane, state: PlaygroundState) {
	// The bound value's format is a playground-level choice, not a param of
	// either control, so it sits above the two folders
	const formatBinding = pane.addBinding(state, 'format', {
		options: Object.fromEntries(FORMAT_IDS.map((id) => [FORMAT_LABELS[id], id])),
	})

	// Options the built-in Tweakpane color control also supports
	const colorFolder = pane.addFolder({ title: 'Tweakpane Color', expanded: true })
	const typeBinding = colorFolder.addBinding(state, 'type', {
		options: { int: 'int', float: 'float' },
	})
	colorFolder.addBinding(state, 'alpha')
	colorFolder.addBinding(state, 'expanded')
	colorFolder.addBinding(state, 'picker', {
		options: { inline: 'inline', popup: 'popup' },
	})

	// This plugin's additions
	const plusFolder = pane.addFolder({ title: 'Tweakpane Color Plus', expanded: true })
	plusFolder.addBinding(state, 'paletteChannels', {
		options: Object.fromEntries(PALETTE_CHANNELS_IDS.map((id) => [id, id])),
	})
	plusFolder.addBinding(state, 'paletteProjection', {
		options: Object.fromEntries(PALETTE_PROJECTION_IDS.map((id) => [id, id])),
	})
	plusFolder.addBinding(state, 'gamutLines', {
		options: Object.fromEntries(PALETTE_GAMUT_BOUNDARIES_IDS.map((id) => [id, id])),
	})
	plusFolder.addBinding(state, 'gamutLabel')
	plusFolder.addBinding(state, 'constrain')
	plusFolder.addBinding(state, 'formatLocked')
	plusFolder.addBinding(state, 'textFields')
	plusFolder.addBinding(state, 'swatchFallback', {
		options: { clip: 'clip', css: 'css' },
	})

	const gamutsFolder = plusFolder.addFolder({ title: 'Gamuts', expanded: true })
	for (const id of GAMUT_IDS) {
		gamutsFolder.addBinding(state, id)
	}

	return { formatBinding, typeBinding }
}

function buildOptions(slot: PickerSlot): Record<string, unknown> {
	const { state } = slot

	// Per-value-type color options: alpha mode only applies to number values,
	// float mode only to object and tuple values (the plugin warns otherwise)
	const color: Record<string, unknown> = { formatLocked: state.formatLocked }
	if (slot.format === 'number') {
		color.alpha = state.alpha
	} else if (hasTypeOption(slot.format)) {
		color.type = state.type
	}

	return {
		view: 'color-plus',
		label: 'Color',
		picker: state.picker,
		expanded: state.expanded,
		paletteChannels: state.paletteChannels,
		paletteProjection: state.paletteProjection,
		gamutLines: state.gamutLines,
		gamutLabel: state.gamutLabel,
		constrain: state.constrain,
		color,
		swatchFallback: state.swatchFallback,
		textFields: state.textFields,
		gamuts: GAMUT_IDS.filter((id) => state[id]),
	}
}

function rebuildPicker(slot: PickerSlot): void {
	slot.binding?.dispose()

	// Re-encode the slot's current color into its format. Alpha for string,
	// object, and tuple values comes from the value itself, so encode (or
	// drop) it to match the alpha toggle; number values carry it via
	// color.alpha.
	const isFloat = hasTypeOption(slot.format) && slot.state.type === 'float'
	const model = ColorPlusModel.create(slot.params.color, slot.encoding.alpha, slot.encoding.type)
	const format = ColorPlusModel.getFormat(
		FORMAT_EXEMPLARS[exemplarKey(slot.format, slot.state.type)][
			slot.state.alpha ? 'alpha' : 'opaque'
		],
		slot.format === 'number' ? slot.state.alpha : undefined,
		isFloat ? 'float' : 'int',
	)
	if (model !== undefined && format !== undefined) {
		slot.params.color = model.toValue(format, slot.state.alpha)
		slot.encoding = {
			alpha: slot.format === 'number' && slot.state.alpha,
			type: isFloat ? 'float' : 'int',
		}
	}

	// Title reflects the current format + type combination
	slot.pane.title =
		FORMAT_LABELS[slot.format] +
		(hasTypeOption(slot.format) && slot.state.type === 'float' ? ' (float)' : '')

	slot.binding = slot.pane.addBinding(slot.params, 'color', buildOptions(slot))
	updateCellBackground(slot)
}

// Paint the slot's grid cell with its active color, whatever format it's
// bound in; the last-changed slot's color also takes over the page background
function updateCellBackground(slot: PickerSlot): void {
	const model = ColorPlusModel.create(slot.params.color, slot.encoding.alpha, slot.encoding.type)
	if (model === undefined) {
		return
	}

	const cssColor = model.serialize(
		{ alpha: true, format: 'oklch', space: 'oklch', type: 'string' },
		true,
	)
	slot.cellElement.style.backgroundColor = cssColor
	if (slot === activeSlot) {
		document.body.style.backgroundColor = cssColor
	}
}

for (const { format, type } of INITIAL_CELLS) {
	rebuildPicker(createSlot(format, type))
}
