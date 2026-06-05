# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.10.2] - 2026-06-05

### Fixed
- Removed the last suppressed lint directive the developer-dashboard scan flagged. `globals.d.ts` now references Obsidian's `Command`/`Hotkey`/`PluginManifest` types via inline `import("obsidian").X`, so the `no-undef` block disable (and its unpaired enable) is gone entirely rather than described. No runtime change.

## [0.10.1] - 2026-06-05

### Fixed
- Cleared developer-dashboard scan findings by removing suppressed lint rules instead of disabling them. The context-capture helper now reads the Obsidian version from the exported `apiVersion` and the Electron version from `window.process.versions` behind a desktop guard, dropping two `obsidianmd/platform` disables. The `globals.d.ts` ambient augmentation pairs its `no-undef` block disable with a matching `eslint-enable`. No runtime behavior changed.

## [0.10.0] - 2026-06-05

### Changed
- Requires Obsidian 1.13.0 or later. Obsidian keeps serving 0.9.0 to vaults on older versions, so nothing breaks for them.
- Settings migrated to Obsidian's declarative settings API. The storage folder and each tool's enabled toggle are now indexed in Obsidian's global settings search, and every tool is its own labeled group whose settings body shows or hides live as you toggle it. Each tool's own settings keep their existing custom controls. No setting changed its stored value or behavior.
- Replaced the deprecated `setWarning()` call on the reloader's remove-plugin button with `setDestructive()` for the Obsidian 1.13.0 API.

## [0.9.0] - 2026-06-01

### Added
- Diagnostics log: a new tool that keeps a structured per-command results ledger as one markdown file in the vault. Each entry is a section with a label, status (ok, error, or info), an optional elapsed time, an ISO timestamp, and a body that is either a JSON block for a success payload or a fenced error with name, message, and stack. Other tools record entries through the shared `lib.diagnostics` bus, so the log fills as you use the toolbox. Use the "Copy diagnostics log", "Clear diagnostics log", and "Open diagnostics log" commands, or the ribbon (`scroll-text` icon), to work with the file. The log subfolder and an opt-in session-start snapshot are configurable, and disabling the tool turns recording off entirely.
- Event spy: a new passive tool that observes Obsidian's event buses and records each firing to the diagnostics log so you can see event timing and order in the vault. Workspace watching covers file-open, active-leaf-change, and layout-change. Vault watching covers create, modify, delete, and rename. Editor changes (editor-change) can be watched too but are off by default because that event fires on every keystroke and would flood the log. Records go to the diagnostics log and require the Diagnostics log tool to be enabled; with it off, observed events are dropped. The spy filters out its own log writes (anything under the storage root) so recording an event cannot trigger another write and loop forever.

## [0.8.1] - 2026-05-30

### Fixed
- Removed the word "Obsidian" from the manifest description, which the marketplace flags as redundant with the plugin directory context.
- Replaced a `!important` hide rule with a higher-specificity selector, per the guideline to avoid `!important`.
- Renamed the command inspector's command and ribbon action to "Inspect hotkeys and ids" so its command id and name no longer contain the word "command", per the command-naming guideline.

## [0.8.0] - 2026-05-30

### Added
- Icon browser: a new tool that lists and previews every icon ID usable in `setIcon` and `addRibbonIcon`. Open it from the ribbon (`palette` icon) or the "Browse icons" command, search by ID, and click any icon to copy its ID string to the clipboard. The list is read live from Obsidian, so it reflects the icons actually registered in your install.
- CSS variable inspector: a new tool that lists every CSS custom property (`--name`) the app and active theme define, each with its live computed value for the current light or dark scheme. Open it from the ribbon (`paintbrush` icon) or the "Inspect CSS variables" command, search by name or value, and click any row to copy a paste-ready `--name: value;` declaration. A "Copy all" action copies the whole filtered list. Values are read live via the CSSOM, so they track the active theme.
- Command inspector: a new tool that lists every registered command with its owning plugin and effective hotkey. Open it from the ribbon (`terminal` icon) or the "Inspect commands" command, search by command ID, plugin, or hotkey, and click any row to copy the command ID. The hotkey shown is the binding actually in effect (a user override beats the app default, which beats the plugin-declared default), and "Copy all" exports the filtered list as tab-separated rows. Commands and hotkeys are read live from Obsidian's internal registries, so the table degrades gracefully if a future build changes their shape.
- Inspector modals (icon browser, CSS variable inspector, command inspector) share a wider dialog and a virtualized list, so the full result set scrolls smoothly with no display cap. Each uses Obsidian's native search box with a clear button, and long IDs and values truncate with an ellipsis and a hover tooltip instead of wrapping.

## [0.7.0] - 2026-05-29

### Added
- State inspector: a new tool that shows the live environment as a browse-and-copy snapshot. Open it from the ribbon (`activity` icon) or the "Inspect live state" command to see the Obsidian version, Electron version, operating system, vault name, active file, view mode, leaf type, and enabled plugin count. Copy any single field, or copy the whole snapshot as one block. It respects the same include-vault-name, include-plugin-list, and path-style options as issue capture.
- The captured context now includes the Electron version, so it also appears in issue-capture payloads and notes.

## [0.6.0] - 2026-05-29

### Added
- Annotation editing (issue capture): a new Select tool puts the stage into edit mode where you click an annotation to move, resize, or rotate it with handles. Shift-click (or ctrl/cmd-click) selects multiple objects to move, recolor, or delete as a group. Changing color or stroke width with objects selected applies to the selection. A Delete action removes the selected objects.
- Blackout redactions are locked on placement: they cannot be selected, moved, resized, or deleted until you flip the Unlock blackouts toggle in the annotation toolbar, so a redaction cannot be slid off the thing it hides by accident.
- Highlight tool: drag a semi-transparent marker fill over the screenshot. Overlapping strokes blend like a real highlighter.
- Re-edit committed text: double-click any text annotation to change its wording. Clearing the text removes the object.
- Annotation drafts: closing the capture without copying now keeps the screenshot and your editable annotations. The new "Resume annotation draft" command reopens the modal with every object still editable instead of a flattened image. The draft is cleared once you copy. A settings toggle controls whether drafts are kept (on by default).

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
