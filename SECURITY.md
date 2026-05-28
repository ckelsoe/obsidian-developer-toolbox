# Security Policy

## Supported Versions

Only the latest published version of Developer Toolbox receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Developer Toolbox, please report it **privately** so it can be fixed before public disclosure:

1. **DO NOT** open a public GitHub issue for security vulnerabilities.
2. Open the repository's **Security** tab and click **Report a vulnerability**, or use this direct link: <https://github.com/ckelsoe/obsidian-developer-toolbox/security/advisories/new>
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Reports submitted through GitHub private vulnerability reporting are visible only to you and the maintainer until an advisory is published.

### What to expect:

- Acknowledgment within 48 hours
- Assessment and response within 7 days
- Security patch released as soon as possible
- Credit given to reporter (unless you prefer to remain anonymous)

## Security Considerations

The plugin reads and writes files inside your vault, captures the visible Obsidian window via Electron's `webContents.capturePage` (or a `desktopCapturer + getUserMedia` fallback), and writes structured context (Obsidian version, OS, vault name, active file path, enabled plugin list) into a markdown payload that you copy to your clipboard. The plugin contains no network code and exfiltrates nothing automatically.

Specific concerns worth knowing:

- **Screen capture access.** The plugin can read pixels of the Obsidian window via Electron APIs. It uses this only when you explicitly invoke a capture command or click the screenshot ribbon icon. There is no continuous or background capture.
- **Clipboard writes.** The plugin writes a markdown payload to your clipboard when you click Copy. The exact bytes that are written are visible in an editable preview above the Copy button. Edits to the preview apply to the clipboard write.
- **Path redaction defaults.** The plugin redacts your home directory and vault absolute path by default before including them in payloads. Absolute-path mode requires an explicit opt-in in settings.
- **No background tasks.** The plugin does not run polling, scheduled jobs, file watchers, or anything else outside the explicit user actions it documents.

If you discover the plugin doing any of the above outside the documented patterns, that itself is a security issue worth reporting via the private channel above.
