# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-28

### Added
- Plugin toolbox dispatcher with a typed ToolHandle contract, per-tool enable/disable from the settings tab, and automatic side-effect cleanup on disable or unload.
- Issue Capture tool: capture an Obsidian screenshot, annotate it, fill in type and description, review a paste-ready markdown payload, and copy.
- Capture pipeline based on `webContents.capturePage` (verified by the 2026-05-28 spike: 150-230 ms, pixel-perfect, captures DOM + native window chrome + every transient UI tested). Automatic fallback to `desktopCapturer.getSources + getUserMedia` for forward-compatibility if `electron.remote` is removed in a future Obsidian Electron upgrade.
- Three command-palette entries: "Developer Toolbox: Screenshot now", "Developer Toolbox: Delayed screenshot", "Developer Toolbox: Text-only issue". Two ribbon icons (camera + message-square-plus).
- Annotation toolbar: freehand pen, box, arrow, text label, blackout (PII redaction), plus undo, redo, clear-all. Color palette of eight swatches keyed by data-color attribute so the colored circles render correctly regardless of theme. Stroke width selector with three presets (thin 2 px, medium 4 px, thick 7 px). Text annotation opens an inline textarea on click; Enter commits, Esc cancels, blur commits.
- Countdown for the delayed capture uses Obsidian's `Notice` API so it is reliably visible regardless of theme z-index ordering. Decrements once per second and auto-dismisses before the capture frame.
- Auto-captured context: Obsidian version (via userAgent regex; `App.appVersion` is `undefined` in 1.12.7), OS family, vault name, active file path, view mode, active leaf type, enabled plugin list. View-mode detection falls back to scanning open markdown leaves when focus has briefly moved to the capture flow. Path redaction defaults to vault-relative with the home directory replaced by `~`.
- Settings tab: per-tool enabled toggle, delayed-countdown duration, default issue type, screenshot folder, plus a Privacy section (home-redact, plugin-list, vault-name toggles, path-style dropdown).

### Deferred to v0.2.0
- Per-object selection, move, resize, and rotation on annotations. Per-tool transform handles will use Konva's Transformer.
- Highlight (semi-transparent) annotation tool.
- Editable annotation persistence across modal closures (Konva `stage.toJSON()` sidecar).
- Multi-select.
- Double-click to edit existing text annotations in place.

### Verified
- Capture API works in Obsidian 1.12.7 / Electron 39.8.3 on Windows 11 (2026-05-28 spike, retained images in `obs-test-vault/spike-images/`).
- End-to-end workflow signed off by user on 2026-05-28: screenshot, annotation (pen, box, arrow, text, blackout, stroke widths, color swatches), payload generation, copy, save to vault, and delayed-countdown capture all functional.
- minAppVersion bumped to 1.5.7 to cover `Vault.getFolderByPath` (used during dev-screenshots folder management).
