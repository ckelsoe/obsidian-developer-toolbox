# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-05-29

### Added
- New issue type: Feedback, for subjective input that is not a defect, enhancement, or question.
- Separate ribbon icons for immediate (`camera`) and delayed (`timer`) screenshots, alongside the text-only issue icon.

### Changed
- Immediate screenshots now apply a short configurable settle (default 300 ms, slider 0-500 ms) so the triggering click and its highlight clear before the frame is grabbed, and the triggering element is blurred. The delayed countdown is now a slider (2-15 s, default 5 s).
- Output paths are now a single shared "Storage folder" (default `_dev-tools`) plus a per-tool subfolder name. Set the root once and screenshots, issue notes, and the reloader log all move with it. Each subfolder setting shows the storage folder as its prefix. Existing installs are migrated: the storage root is set and each tool's subfolder is derived from its previous path; custom subfolder names are preserved.

## [0.4.0] - 2026-05-29

### Added
- Issue notes: capturing an issue now also writes a Markdown note to the vault (default `dev-tools/dev-issues/`) with the type, context, description, and an embedded link to the screenshot when one was captured. On by default; toggle and folder are configurable in settings.

### Changed
- Output files are now grouped under a single `dev-tools/` parent folder: screenshots in `dev-tools/dev-screenshots/`, the reloader event log in `dev-tools/dev-logs/`, and issue notes in `dev-tools/dev-issues/`. Existing installs that kept the old default paths are migrated automatically; custom paths are preserved.
- Folder creation now creates missing parent folders, so nested output paths work without manual setup.

### Fixed
- Settings defaults are merged into stored settings on load, so a newly added setting is never undefined for an existing install.

## [0.3.0] - 2026-05-29

### Added
- Reloader event log (opt-in): appends every watcher and reload event to a timestamped Markdown file in the vault (default `developer-toolbox-reloader-log.md`). Records watcher start, each detected file change with its filename, and each reload outcome. Writes are serialized so a build's burst of events cannot interleave. Settings expose a toggle, the log path, and an Open button. Useful for confirming the watcher fires and for spotting events too fast to see on screen.

### Changed
- Reloading a plugin now re-scans manifests from disk (via Obsidian's internal `loadManifests`) between disable and enable, so the version shown in Obsidian's Community plugins list reflects the freshly built `manifest.json` instead of the value cached at startup. Best-effort and guarded against the internal method being absent.

### Fixed
- File watcher no longer fires phantom reloads. Events with no filename (emitted by some platforms on rename or atomic writes) were bypassing the watched-files filter and triggering a reload roughly every few minutes when the folder was touched, for example by Obsidian rewriting `data.json`. The filter now requires a known filename.

## [0.2.0] - 2026-05-28

### Added
- Plugin reloader tool. Reloads a plugin in place via Obsidian's internal `disablePlugin` + `enablePlugin` so a fresh build takes effect without restarting Obsidian.
- Configurable dev plugins: pick plugins by name in the settings tab; the IDs are stored. The "Developer Toolbox: Reload plugin" command opens a fuzzy picker of installed plugins (listed by display name with the ID as subtext, never typed by hand). The "Developer Toolbox: Reload dev plugins" command reloads all configured dev plugins at once.
- Status ribbon icon: doubles as a reload status light. Turns amber and pulses when a watched file changed and a reload is pending; flashes green right after a reload. Clicking it reloads the configured dev plugins and clears the pending state.
- Status bar indicator: a persistent always-visible item showing the running toolbox version (read from disk) and the load time, for example `↻ v0.2.0 · 18:27:43`. The load time updates on every reload so a same-version reload still visibly confirms it took effect. Shows `↻ reload needed` when a change is pending and `↻ reloaded ✓` right after a reload. Clicking it reloads the configured dev plugins.
- File watching: when dev plugins are configured, their folders are watched for changes to `main.js`, `manifest.json`, or `styles.css`. The directory is watched rather than the file so esbuild's atomic-rename writes do not deafen the watch after the first build. Events are debounced (default 250 ms, configurable) to coalesce a single build's burst of writes.
- Auto-reload toggle (off by default): when on, a detected change reloads the plugin immediately; when off, the change only flags the ribbon icon so you reload manually.
- Reloader diagnostics (on by default): a notice surfaces on watcher start, on a pending change, and on every reload, so a silent watcher failure becomes visible.
- Reload notices report the reloaded plugin's version, read straight from `manifest.json` on disk so it reflects the freshly built file regardless of Obsidian's in-memory manifest cache.
- Settings tab footer shows the toolbox version and a link to the GitHub repository.

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
