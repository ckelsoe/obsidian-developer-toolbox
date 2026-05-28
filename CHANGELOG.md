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
- Three command-palette entries: "Issue capture: Screenshot now", "Issue capture: Delayed screenshot", "Issue capture: Text-only issue". Two ribbon icons (camera + message-square-plus).
- Annotation toolbar: freehand pen, box, arrow, blackout (PII redaction), plus undo, redo, clear-all. Color palette of eight swatches.
- Auto-captured context: Obsidian version (via userAgent regex; `App.appVersion` is `undefined` in 1.12.7), OS family, vault name, active file path, view mode, active leaf type, enabled plugin list. Path redaction defaults to vault-relative with the home directory replaced by `~`.
- Settings tab: per-tool enabled toggle, delayed-countdown duration, default issue type, screenshot folder, plus a Privacy section (home-redact, plugin-list, vault-name toggles, path-style dropdown).

### Deferred to v0.2.0
- Per-object selection, move, resize, and rotation on annotations. Per-tool transform handles will use Konva's Transformer.
- Text label and highlight annotation tools.
- Editable annotation persistence across modal closures (Konva `stage.toJSON()` sidecar).
- Multi-select.

### Verified
- Capture API works in Obsidian 1.12.7 / Electron 39.8.3 on Windows 11 (2026-05-28 spike, retained images in `obs-test-vault/spike-images/`).
- minAppVersion bumped to 1.5.7 to cover `Vault.getFolderByPath` (used during dev-screenshots folder management).
