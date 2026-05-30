# Developer Toolbox

[![CI](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-developer-toolbox/ci.yml?branch=main&label=CI&logo=github)](https://github.com/ckelsoe/obsidian-developer-toolbox/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-developer-toolbox/release.yml?label=Release&logo=github)](https://github.com/ckelsoe/obsidian-developer-toolbox/actions/workflows/release.yml) [![GitHub Downloads](https://img.shields.io/github/downloads/ckelsoe/obsidian-developer-toolbox/total?logo=github&label=Downloads)](https://github.com/ckelsoe/obsidian-developer-toolbox/releases) [![GitHub Stars](https://img.shields.io/github/stars/ckelsoe/obsidian-developer-toolbox?style=flat&logo=github&label=Stars)](https://github.com/ckelsoe/obsidian-developer-toolbox) [![Obsidian](https://img.shields.io/badge/Obsidian-v1.5.7%2B-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md) [![License](https://img.shields.io/github/license/ckelsoe/obsidian-developer-toolbox)](https://github.com/ckelsoe/obsidian-developer-toolbox/blob/main/LICENSE) [![Latest Release](https://img.shields.io/github/v/release/ckelsoe/obsidian-developer-toolbox?label=Latest)](https://github.com/ckelsoe/obsidian-developer-toolbox/releases/latest)

A toolbox of developer-focused tools for Obsidian: capture annotated screenshots with structured issue context, reload plugins live while you develop, browse icon IDs, and inspect CSS variables and registered commands.

## Tools

Developer Toolbox bundles several developer-focused tools under one plugin. Each tool has its own enable and disable toggle in the settings tab, so you can run only what you need.

### Issue capture

Capture a screenshot of your Obsidian window, annotate it, classify it, and generate a paste-ready Markdown payload with structured context (active file, view mode, Obsidian version, OS, enabled plugins) for use with AI assistants or issue trackers.

- Two capture modes: an immediate screenshot, and a delayed screenshot with a countdown that gives you time to open a menu, tooltip, or settings pane before the shot fires. Both capture the full window, including transient UI.
- Annotate in place: freehand pen, box, arrow, text labels, and a blackout tool for redacting sensitive content, plus undo, redo, and clear.
- Classify the capture (defect, enhancement, feedback, question, task, or note) and add a description.
- Save an issue note: optionally writes a Markdown note to your vault with the details and an embedded link to the screenshot.
- Privacy first: paths are redacted to vault-relative with your home directory hidden by default, and you review the exact payload before it is copied.

### Plugin reloader

Reload a plugin without restarting Obsidian, so a fresh build takes effect immediately while you develop.

- Reload any installed plugin from a searchable picker, or configure a set of dev plugins to reload together.
- Optional auto-reload: watch your dev plugins' build output and reload automatically when it changes.
- A status bar indicator shows the running version and the time of the last reload, and turns amber when a watched change is pending. Click it to reload.

### Icon browser

Browse and preview every icon ID available to Obsidian's `setIcon` and `addRibbonIcon`, so you can find the right glyph without guessing at names.

- Open from the ribbon (`palette` icon) or the "Browse icons" command.
- Search by icon ID and click any icon to copy its ID string to the clipboard.
- The grid is read live from Obsidian, so it reflects the icons actually registered in your install.

### CSS variable inspector

Inspect the CSS custom properties the app and your active theme define, each with its live computed value, so you can style and theme against the real variables.

- Open from the ribbon (`paintbrush` icon) or the "Inspect CSS variables" command.
- Search by variable name or value, and click any row to copy a paste-ready `--name: value;` declaration. "Copy all" copies the whole filtered list.
- Values resolve for the current light or dark scheme and are read live via the CSSOM, so they track theme changes.

### Command inspector

List every registered command with its owning plugin and the hotkey actually bound to it, so you can find command IDs and spot binding conflicts.

- Open from the ribbon (`terminal` icon) or the "Inspect commands" command.
- Search by command ID, plugin, or hotkey, and click any row to copy the command ID. "Copy all" exports the filtered list as tab-separated rows.
- The hotkey shown is the effective binding (a user override beats the app default, which beats the plugin's declared default). Commands and hotkeys are read live from Obsidian's internal registries.

## Installation

### From Obsidian Community Plugins (recommended)

1. Open Obsidian settings.
2. Navigate to **Community plugins**.
3. Click **Browse**.
4. Search for **Developer Toolbox**.
5. Click **Install**, then **Enable**.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/ckelsoe/obsidian-developer-toolbox/releases/latest).
2. Create a folder named `developer-toolbox` in your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into this folder.
4. Reload Obsidian.
5. Enable **Developer Toolbox** in Settings → Community plugins.

### BRAT (optional, for pre-release testing)

BRAT lets power users install pre-release builds before they reach the marketplace.

1. Install the **BRAT** plugin from Community Plugins.
2. Open BRAT settings and click **Add Beta Plugin**.
3. Enter: `https://github.com/ckelsoe/obsidian-developer-toolbox`
4. Enable **Developer Toolbox** in Settings → Community plugins.

## Usage

Open the command palette and search for "Developer Toolbox", or use the ribbon icons on the left. Each tool is configured in Settings → Community plugins → Developer Toolbox, where you can enable or disable tools individually.

This plugin is desktop only. Screenshot capture and plugin reloading rely on desktop APIs that are not available on Obsidian mobile.

## Output

Screenshots, issue notes, and the reloader log are saved under a single configurable storage folder (default `_dev-tools`), each in its own subfolder. Change the storage folder once in settings and all output moves with it.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
