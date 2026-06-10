import type { Value, ValueEvents } from '@tweakpane/core'

/**
 * Synchronizes two values like `@tweakpane/core`'s `connectValues`, but returns
 * a disconnect function so a short-lived secondary (e.g. the text inputs
 * rebuilt on every mode switch) can unsubscribe from a long-lived primary
 * instead of accumulating stale change handlers on it.
 */
export function connectValues<T1, T2>(config: {
	backward: (primary: T1, secondary: T2) => T1
	forward: (primary: T1, secondary: T2) => T2
	primary: Value<T1>
	secondary: Value<T2>
}): () => void {
	const { backward, forward, primary, secondary } = config

	// Prevents an event firing loop (primary change → secondary change → ...)
	let isChanging = false
	function preventFeedback(callback: () => void) {
		if (isChanging) {
			return
		}

		isChanging = true
		callback()
		isChanging = false
	}

	function onPrimaryChange(event: ValueEvents<T1>['change']) {
		preventFeedback(() => {
			secondary.setRawValue(forward(primary.rawValue, secondary.rawValue), event.options)
		})
	}

	function onSecondaryChange(event: ValueEvents<T2>['change']) {
		preventFeedback(() => {
			primary.setRawValue(backward(primary.rawValue, secondary.rawValue), event.options)
		})

		// Re-update the secondary to apply changes from the primary's constraint
		preventFeedback(() => {
			secondary.setRawValue(forward(primary.rawValue, secondary.rawValue), event.options)
		})
	}

	primary.emitter.on('change', onPrimaryChange)
	secondary.emitter.on('change', onSecondaryChange)

	preventFeedback(() => {
		secondary.setRawValue(forward(primary.rawValue, secondary.rawValue), {
			forceEmit: false,
			last: true,
		})
	})

	return () => {
		primary.emitter.off('change', onPrimaryChange)
		secondary.emitter.off('change', onSecondaryChange)
	}
}
