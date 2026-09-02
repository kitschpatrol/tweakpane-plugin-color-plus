import { vi } from 'vitest'

/**
 * Spy on console warnings for a test that exercises a warn-and-fall-back path,
 * so the warning can be asserted instead of printed. Restored by the caller's
 * `vi.restoreAllMocks()`.
 */
export function spyOnWarnings() {
	return vi.spyOn(console, 'warn').mockImplementation(() => {
		// Expected warnings are asserted, not printed
	})
}
