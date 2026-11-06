# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.1] - 2026-11-02

### Fixed

- Declare exported `css` as `string` instead of the build-placeholder literal in published TypeScript definitions.

### Documentation

- Add an npm download-count badge to the README.

### Maintenance

- Refresh development dependencies and pnpm 12.16.1, and set the development Node.js requirement to `^24.16.0 || >=26.3.0`.
- Refresh GitHub Actions, run dependency updates monthly and exclude loopback URLs from link checking.
- Build before lint/fix commands, migrate shared-config skill integration and simplify internal color-model code.

## [0.7.0] - 2026-10-06

### Changed

- **Breaking:** Change supported Node.js versions to `^22.0.0 || ^24.0.0 || >=26.0.0`, dropping Node.js 20 support.
- Increase hue-slider saturation and smooth its lightness transitions for clearer hue selection.

### Maintenance

- Add a scheduled dependency-update workflow and refresh pinned release, metadata and CI actions.
- Refresh development tooling with pnpm 12, Vitest 5 and shared-config updates, simplify lint configuration and apply behavior-preserving source refactors.

## [0.6.2] - 2026-09-03

### Fixed

- Restore ES2022 compatibility by replacing ES2024 Unicode-set regular-expression flags with `u` flags.

### Documentation

- Correct the link to Svelte Tweakpane UI’s ColorPlus component.

## [0.6.1] - 2026-09-03

### Added

- Export named value types for string, number, object, RGB/RGBA tuple and combined tuple bindings.
- Export `ColorPlusGamutLines`, `ColorPlusPaletteChannels`, `ColorPlusPaletteProjection`, `ColorPlusSwatchFallback` and `ColorPlusType` option types.

## [0.6.0] - 2026-09-02

### Added

- Support CSS named colors as initial bindings, serialize edits to the perceptually nearest name, and support `transparent` with alpha controls.
- Show named-color patches for locked keyword bindings and snap swatches and text fields live to the selected name while preserving continuous pointer movement.

### Changed

- **Breaking:** Reject unrecognized palette options and gamut IDs with Tweakpane’s `No matching controller` error instead of falling back or ignoring them.

### Fixed

- Parse packed numeric colors with leading zero bytes correctly and honor `color.alpha` explicitly, matching Tweakpane’s bitwise number-color behavior.
- Clamp channels to byte ranges before packing numeric colors so out-of-gamut values cannot corrupt neighboring channels.
- Preserve out-of-gamut coordinates when serializing functional color strings with constraining disabled.
- Write integer object and tuple channels as whole numbers and normalize rounded negative zero to zero.
- Preserve each bound object’s original key spelling during write-back, including uppercase channel and alpha keys.
- Preserve `null` object channels during serialization and write-back.
- Retain compatible sibling channel notation when a string coordinate initially parsed as `none` receives a value.
- Propagate alpha text-field edits and drag updates immediately to the bound value and swatch.
- Apply configured gamut constraints to typed picker-channel and hex-field values.
- Treat HSL hue 360 as hue 0 instead of accidentally changing the working OKLCH hue.
- Keep the bound value’s type, tuple length and object keys when `color.formatLocked` is false, preventing incompatible format-switch write errors.
- Consistently ignore inapplicable `color.alpha` and `color.type` options when configuring controllers and writing values.
- Silence console warnings for invalid text-field input.
- Parse object-style strings without spaces and accept uppercase `0X` hexadecimal prefixes.
- Render the alpha strip and slider marker using OKLCH so wide-gamut previews agree with the color swatch.

### Documentation

- Document named-color snapping, adaptive defaults, option validation and format-lock restrictions, and expand playground examples across value formats.
- Correct CDN module-loading instructions, nested float-option syntax and banner alternative text.

### Maintenance

- Expand parsing, serialization, binding, gamut and picker-model regression tests, and add V8 coverage reporting.
- Strengthen internal format types with a discriminated union, remove unused code and exclude scratch declarations from the published package.
- Refresh development dependencies and pnpm, update publishing authentication and adjust dependency installation policy.

## [0.5.1] - 2026-08-16

### Documentation

- Correct and refresh README reference links.

### Maintenance

- Update the bundled Color.js requirement to `^0.7.1`.
- Refresh development dependencies, editor tasks and TypeScript configuration, with behavior-preserving lint and test cleanup.
- Add scheduled repository/website link checking and modernize release tag and default-branch validation.

## [0.5.0] - 2026-07-14

### Changed

- **Breaking:** Raise the distributed browser JavaScript build target from ES2020 to ES2022.

### Fixed

- Mark the package as side-effectful so bundlers preserve import-time color-space registration.

### Documentation

- Update implementation documentation for Color.js 0.7.x.

### Maintenance

- Upgrade bundled Color.js to `^0.7.0`, migrate to its typed parsing and serialization APIs, and add string round-trip regression tests.
- Refresh development dependencies with shared-config 8 and TypeScript 6, reorganize declaration builds, and adapt source and demos to stricter checks.

## [0.4.1] - 2026-06-10

### Fixed

- Keep the palette marker moving during drags along black edges and collapsed black/white bands.

### Documentation

- Add OpenGraph artwork for repository previews.

## [0.4.0] - 2026-06-10

### Added

- Replace the fixed saturation/value palette with a wide-gamut OKLCH plane supporting six channel layouts and OKHSV, perceptual and stretch projections.
- Add configurable RGB gamut boundaries and labels through `gamuts`, `gamutLines` and `gamutLabel`.
- Add `constrain` to snap plane picks and clamp slider, main text-field and external color updates into the widest configured gamut.
- Add OKLCH and OKHSV channel-text modes and a `textFields` option for hiding the model selector and channel fields.
- Allow `ColorPlusModel.toGamut()` callers to choose `clip` or `css` gamut mapping.

### Changed

- Choose default gamuts, gamut-label visibility and the initial channel-text mode from the bound color format.
- Make sRGB swatch-fallback mapping configurable with `swatchFallback`, defaulting to clipping instead of CSS gamut mapping.

### Fixed

- Write tuple edits back into the bound array in place, preserving external references.
- Suppress no-op writes during refresh and equal-color edits so existing bound formatting is preserved.
- Disconnect stale value subscriptions when switching text modes or disposing picker views.
- Honor explicit hex-field alpha for alpha-capable bindings and preserve the current alpha when typed text omits it.

### Documentation

- Document picker options and wide-gamut behavior, add a configurable playground, refresh demos and screenshots, and identify color strings that browsers reject as CSS.

### Maintenance

- Refresh development dependencies and demo tooling, and add writer, gamut and OKHSV regression tests.

## [0.3.1] - 2026-05-17

### Documentation

- Expand contribution guidance with issue-first expectations and documentation of the shared lint and README-generation tools.

### Maintenance

- Fix release validation for prefixed and unprefixed version tags, and pass npm authentication directly to the publishing command.
- Refresh development dependencies and GitHub Actions, migrate to pnpm 11 build permissions, and update contributor scripts and lint compatibility.

## [0.3.0] - 2026-04-08

### Changed

- **Breaking:** Raise the distributed browser JavaScript build target from ES2015 to ES2020.

### Documentation

- Add a CI status badge to the README.

### Maintenance

- Replace Rollup with tsdown for bundled and lite builds, modernize Sass compilation and declare package side-effect metadata.
- Add build, lint and test CI on Linux, macOS and Windows, and refresh release and metadata workflows.
- Refresh development dependencies, including shared-config 7 and Vite 8, and declare a separate Node.js development requirement.

## [0.2.0] - 2026-01-20

### Documentation

- Update the Color.js dependency documentation for the stable 0.6.x series and remove the alpha-release caveat.

### Maintenance

- Update the bundled Color.js requirement to `^0.6.1`.
- Refresh development dependencies and pnpm, and restore contributor-tool dependency hoisting through workspace configuration.

## [0.1.9] - 2025-12-02

### Maintenance

- Update the bundled Color.js requirement to `^0.6.0-beta.3`.
- Refresh development dependencies, including Vitest 4, and update the shared Vite/Vitest configuration.

## [0.1.8] - 2025-11-04

### Maintenance

- Update the bundled Color.js requirement to `^0.6.0-beta.1` and adjust conversion test expectations.
- Refresh development dependencies and pnpm, and move dependency build permissions into workspace configuration.
- Switch local npm publishing authentication from one-time passwords to token-based configuration.

## [0.1.7] - 2025-10-07

### Changed

- **Breaking:** Raise the minimum supported Node.js version from 20.9 to 20.19.

### Maintenance

- Refresh development dependencies and pnpm, migrate lint commands to `ksc`, and adopt erasable TypeScript syntax.
- Upgrade and simplify repository metadata synchronization.

## [0.1.6] - 2025-05-31

### Added

- Export `ColorPlusModel` for parsing, inspecting, converting and serializing colors outside the plugin.

### Removed

- **Breaking:** Remove the `ColorController.hasAlpha` getter introduced in 0.1.5.

## [0.1.5] - 2025-05-31

### Added

- Expose `ColorController.hasAlpha` for integrations calculating control placeholder dimensions.

## [0.1.4] - 2025-05-30

### Maintenance

- Correct release-workflow tag validation to recognize version tags without a `v` prefix.

## [0.1.3] - 2025-05-30

### Documentation

- Correct the CDN import map and use the bundled entry point in the README and demo.

## [0.1.2] - 2025-05-30

### Documentation

- Add light/dark README banners and a screenshot demo illustrating supported color representations.

### Maintenance

- Trigger the GitHub release workflow for version tags without a `v` prefix.

## [0.1.1] - 2025-05-30

### Added

- Export the `ColorPlusValue` union for typing supported bound color values.

## [0.1.0] - 2025-05-30

### Added

- Introduce a Tweakpane 4 color input selected with `view: 'color-plus'`, exporting `id`, `css`, `plugins` and `ColorPlusInputParams`.
- Parse CSS Color 4 strings, modern and legacy color functions, hexadecimal strings and `color()` notation across perceptual and wide-gamut spaces.
- Accept packed RGB/RGBA numbers and RGB/RGBA tuples, with integer or floating-point tuple channels.
- Infer RGB, HSL, HSV/HSB, HWB, Lab and LCH objects from mixed long and short channel names, with optional alpha and float channels.
- Retain the original color representation, channel units and alpha notation during editing; support named colors and object/tuple-style text input, with optional format switching through `color.formatLocked: false`.
- Provide popup and inline HSV pickers with hue and alpha controls, RGB/HSL/HSV/hex fields, and split color/sRGB-fallback swatches.
- Distribute ESM bundles and TypeScript declarations, including minified builds and a `/lite` entry point that externalizes `@tweakpane/core`; declare Node.js 20.9 or newer support.

### Documentation

- Provide npm/CDN installation and registration guides, color-format examples, a comparison demo, lite-build instructions and pre-release limitations.

### Maintenance

- Establish Rollup/Sass builds, Vite development demos, Vitest tests, shared lint configuration and automated release tooling.

[0.1.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/releases/tag/0.1.0
[0.1.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.0...0.1.1
[0.1.2]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.1...0.1.2
[0.1.3]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.2...0.1.3
[0.1.4]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.3...0.1.4
[0.1.5]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.4...0.1.5
[0.1.6]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.5...0.1.6
[0.1.7]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.6...0.1.7
[0.1.8]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.7...0.1.8
[0.1.9]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.8...0.1.9
[0.2.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.1.9...0.2.0
[0.3.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.2.0...0.3.0
[0.3.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.3.0...0.3.1
[0.4.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.3.1...0.4.0
[0.4.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.4.0...0.4.1
[0.5.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.4.1...0.5.0
[0.5.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.5.0...0.5.1
[0.6.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.5.1...0.6.0
[0.6.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.6.0...0.6.1
[0.6.2]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.6.1...0.6.2
[0.7.0]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.6.2...0.7.0
[0.7.1]: https://github.com/kitschpatrol/tweakpane-plugin-color-plus/compare/0.7.0...0.7.1
