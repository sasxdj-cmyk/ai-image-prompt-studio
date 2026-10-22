# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Catalog provenance**: six entries are now marked `verified` and carry their
  own source URL and consultation date (melton, gabardine, espadrilles, bokeh,
  deep focus, Rembrandt lighting). A unit test enforces that a `verified`
  entry always has a source and that the list stays in sync with the data.
- **Component tests**: 13 tests of the React layer in jsdom, covering the
  category browser, the generation flow, the single-selection behaviour, the
  manual-edit protection, the clear-all confirmation, the clipboard, the
  language switch and the profile switch.
- **Example files** in `docs/examples`: a valid catalog package and a valid
  preset export, checked by the test suite with the real parsers.
- The prompt panel shows the contribution of every category, and the settings
  panel shows the documented examples of the selected model profile.

### Changed

- The wording of the Rembrandt lighting entry now matches its source (lit
  triangle under the eye).
- The test suite grew from 100 to 123 tests.

## [0.1.0] - 2026-10-21

First public release.

### Added

- **Catalog engine** with 72 categories, 803 options and 11 groups, split into
  a structural manifest (`src/catalog/manifest.ts`) and content data files
  (`src/catalog/data/*.json`), merged and validated at start-up.
- **Prompt engine**: deterministic assembly, logical category order, comma
  separation without duplicated or trailing separators, removal of contradictory
  and repeated fragments, per-category limits, requirement checks and a
  "checks" panel that reports every issue it finds.
- **Category browser** with search, group filter, per-category option search and
  independent categories (changing one never clears another).
- **Global actions**: generate, regenerate, random (with a configurable level of
  variety), clear all with confirmation, copy prompt and copy prompt + negative.
- **Editable prompt** with a manual-edit marker and a confirmation before a
  generated prompt replaces hand-written text.
- **Optional negative prompt** field, never filled automatically.
- **Model profiles** for the general case, Z-Image-Turbo, FLUX.1 [schnell],
  Qwen-Image-2.1, FLUX.2 and FLUX 3 Image Klein, each with its source and a
  verification status.
- **English and Italian interface**, with the prompt language configurable
  independently, and a test that fails when the dictionaries drift apart.
- **Presets** with save, load, duplicate, delete and JSON import/export.
- **History** of the last 50 generated prompts.
- **Local persistence** of preferences, presets, history and session, with
  recovery from corrupted or outdated values.
- **Catalog update system**: versioned JSON packages, manual import, optional
  online manifest (disabled by default, data only, no code execution) and a
  one-click rollback to the previous version.
- **Offline support** through a service worker that caches the app shell.
- **Responsive layout** for desktop and smaller screens, with light and dark
  colour schemes.
- **Test suite** of 95 automated tests and an end-to-end browser run of 26
  checks.

### Known limitations

- No license has been granted yet (see `LICENSE`).
- Catalog updates can replace the content of existing categories; a brand new
  category still needs an application release.
- Only Chromium was used for the automated end-to-end run.

[Unreleased]: https://github.com/sasxdj-cmyk/ai-image-prompt-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sasxdj-cmyk/ai-image-prompt-studio/releases/tag/v0.1.0
