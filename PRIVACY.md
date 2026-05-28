# Privacy Policy

_Last updated: 2026-05-28_

This policy explains what the **Developer Toolbox** Obsidian plugin ("the plugin") does and does not do with your data. It applies to the plugin as distributed through the Obsidian Community Plugins marketplace, GitHub releases, and BRAT.

## Summary

The plugin collects nothing, stores nothing outside your own vault, and sends nothing anywhere. It contains no network code.

## What the plugin does

The plugin captures screenshots of your Obsidian window and a structured snapshot of your editing context (Obsidian version, OS, vault name, active file path, list of enabled plugins, view mode). All of this happens on your own device.

You assemble these into a paste-ready markdown payload that you then copy to your clipboard. The plugin does not send the payload anywhere. You decide where the payload goes after it is on your clipboard. Common destinations are AI assistants (e.g. Claude Code CLI), issue trackers, and chat tools, but the plugin has no knowledge of, or connection to, any of those.

The captured screenshot is saved to a folder you configure inside your vault (default: `dev-screenshots/`). The structured context is included only in the markdown payload that you explicitly copy.

Before copying, the plugin shows you the resolved payload in an editable preview so you can review and redact anything sensitive. Paths are redacted to hide your home directory and OS username by default. The vault name and plugin list can be toggled off in settings.

## Data collection

- **No personal data is collected.** The plugin does not collect names, email addresses, file contents, usage statistics, or any other information.
- **No telemetry or analytics.** There is no tracking, crash reporting, or phone-home behavior of any kind.
- **No automatic background activity.** The plugin acts only when you explicitly invoke a command, click a ribbon icon, or trigger a documented event.

## Data storage

- The plugin's settings are stored by Obsidian in your vault's local `data.json` file, on your own device. They never leave your device.
- Screenshots saved by the plugin are stored in your vault, on your own device.
- No other data is read or written outside your vault.

## Network use

The plugin contains **no network code**. It makes no HTTP requests, opens no sockets, and contacts no servers. Not the maintainer's, not Obsidian's, not any third party.

## Third parties

The plugin shares no data with any third party. It has no data to share and no means to transmit it.

## Disclaimer of liability

The plugin is provided free of charge, "AS IS", without warranty of any kind, as set out in the [MIT License](./LICENSE). To the maximum extent permitted by law, the maintainer is not liable for any loss, damage, or claim arising from use of the plugin.

## Information you choose to share

If you open a GitHub issue, discussion, or pull request, anything you paste there (file contents, screenshots, vault structure, system details) becomes **public**. The maintainer does not request this information and is not responsible for content you choose to post. Review and redact anything sensitive before submitting. To report a security vulnerability privately instead, see [SECURITY.md](./SECURITY.md).

## Changes to this policy

This policy may be updated as the plugin evolves. Material changes will be noted in [CHANGELOG.md](./CHANGELOG.md). The "last updated" date above reflects the current version.

## Contact

Questions about this policy: open an issue at [github.com/ckelsoe/obsidian-developer-toolbox/issues](https://github.com/ckelsoe/obsidian-developer-toolbox/issues). Do not use a public issue for security vulnerabilities; see [SECURITY.md](./SECURITY.md) for the private reporting channel.
