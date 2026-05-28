# Developer Toolbox

[![CI](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-developer-toolbox/ci.yml?branch=main&label=CI&logo=github)](https://github.com/ckelsoe/obsidian-developer-toolbox/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-developer-toolbox/release.yml?label=Release&logo=github)](https://github.com/ckelsoe/obsidian-developer-toolbox/actions/workflows/release.yml) [![GitHub Downloads](https://img.shields.io/github/downloads/ckelsoe/obsidian-developer-toolbox/total?logo=github&label=Downloads)](https://github.com/ckelsoe/obsidian-developer-toolbox/releases) [![GitHub Stars](https://img.shields.io/github/stars/ckelsoe/obsidian-developer-toolbox?style=flat&logo=github&label=Stars)](https://github.com/ckelsoe/obsidian-developer-toolbox) [![Obsidian](https://img.shields.io/badge/Obsidian-v1.5.0%2B-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md) [![License](https://img.shields.io/github/license/ckelsoe/obsidian-developer-toolbox)](https://github.com/ckelsoe/obsidian-developer-toolbox/blob/main/LICENSE) [![Latest Release](https://img.shields.io/github/v/release/ckelsoe/obsidian-developer-toolbox?label=Latest)](https://github.com/ckelsoe/obsidian-developer-toolbox/releases/latest)

A toolbox of developer-focused tools for Obsidian: capture annotated screenshots with structured issue context, and reload plugins live while you develop.

## Tools

Developer Toolbox bundles several developer-focused tools under one plugin. Each tool has its own enable and disable toggle in the settings tab, so you can run only what you need.

### Issue capture

Capture a screenshot of your Obsidian window, annotate it, and generate a paste-ready markdown payload with structured context (active file, view mode, Obsidian version, OS, enabled plugins) for use with AI assistants or issue trackers.

- Screenshot the full window, including transient UI like menus, tooltips, and the command palette. A delayed capture gives you time to open them first.
- Annotate in place: freehand pen, box, arrow, text labels, and a blackout tool for redacting sensitive content, plus undo, redo, and clear.
- Privacy first: paths are redacted to vault-relative with your home directory hidden by default, and you review the exact payload before it is copied.

### Plugin reloader

Reload a plugin without restarting Obsidian, so a fresh build takes effect immediately while you develop.

- Reload any installed plugin from a searchable picker, or configure a set of dev plugins to reload together.
- Optional auto-reload: watch your dev plugins' build output and reload automatically when it changes.
- A status bar indicator shows the running version and the time of the last reload, and turns amber when a watched change is pending. Click it to reload.

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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
