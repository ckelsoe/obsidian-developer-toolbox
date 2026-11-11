# Copilot instructions for obsidian-developer-toolbox

## What this repository is

Developer Toolbox is an [Obsidian](https://obsidian.md) community plugin (TypeScript, esbuild bundle) for plugin and theme developers. It bundles several tools: issue capture, plugin reloader, state inspector, icon browser, CSS variable inspector, command inspector, diagnostics log and event spy. The manifest sets `isDesktopOnly: true`.

Key architecture facts:

- Each tool lives in `tools/<tool>/` and default-exports a `ToolHandle` (see `tools/types.ts`). `main.ts` lists every tool in the `TOOLS` array.
- `register(ctx)` returns a `Disposable`. Everything a tool registers (events, DOM, watchers, intervals) must be torn down in `dispose()`. Disabling a tool in settings calls it.
- A tool with `renderSettings` must also set `settingsSearch`, or settings search cannot find its row.
- Shared code goes through `ToolboxLib` (`lib/types.ts`, built in `lib/index.ts`). Tools never reach into each other.
- Tools log through `lib.diagnostics`. The bus is always present; only the diagnostics tool attaches a sink. With no sink, entries are dropped on purpose.
- All tool output goes under one storage root (`storageRoot`, default `_dev-tools`). Use `lib.storage.resolve()`, never a hard-coded folder.
- Stored settings are versioned (`DATA_VERSION` in `settings.ts`). A shape change needs a step in `migrate()`. `main.ts` merges `defaultSettings` under stored values so new keys are never undefined.
- Annotation uses Konva (`tools/issue-capture/annotation/stage.ts`).

## Build, lint, test

```bash
npm run build          # tsc type-check + esbuild bundle
npm run lint           # eslint (zero warnings), prettier --check, submission pre-check, marketplace type-check
npm test               # Vitest
npm run knip           # unused files and exports
npm run type-coverage  # must stay at or above 99%
```

Build, lint and test must all pass. `npm run test:mutation` runs Stryker on demand.

## Hard rules

- Never `eslint-disable` an `obsidianmd/*` rule. Any other allowed disable carries a `-- reason`.
- No `as any`. No non-null assertions (`x!`). Declare missing members in `globals.d.ts`. All undocumented `App` internals there are optional and must be read defensively.
- No regex lookbehind (`(?<=`, `(?<!`). It does not parse on older iOS JavaScriptCore.
- No bare `moment` from `obsidian`. Use `Date` or `Intl`.
- No `!important` in `styles.css`, no inline `style` attributes, no `innerHTML`/`outerHTML` writes, no `document.createElement`.
- Popout-safe DOM: use `activeDocument`/`activeWindow` or the element's own document, not a global captured once.
- No top-level Node or Electron imports. Reach them through a guarded `window.require` that returns `null` on failure, as in `tools/reloader/watcher.ts`.
- UI strings in sentence case. No "command" in command ids or names. Settings headings never contain "settings", "options", "general" or the plugin name.
- Validate every value read from `data.json` before use.
- Writes to an existing note go through `vault.process`, never `read` then `modify`.
- Vitest only (`vi.*`). Never remove, skip or weaken a test to make CI pass.
- README is public: no CI or release internals. No em dashes in prose or comments.

## Plugin-specific pitfalls

- Privacy first. Never call `os.userInfo()` or `os.homedir()`. Paths in a payload go through `lib.pathRedact`; `redactHomePath` defaults to `true`.
- The clipboard copy in `tools/issue-capture/modal.ts` must write the payload textarea's current value: the exact text the user reviewed. Never rebuild the payload at copy time.
- Blackout annotations are redactions. They stay locked by default (`blackoutsUnlocked` in `stage.ts`) so they cannot be moved off the content by accident.
- The command inspector and reloader read undocumented internals (`app.commands`, `app.hotkeyManager`, `app.plugins`). Guard every access and degrade to an empty result, never throw.
- The reloader watcher needs a `FileSystemAdapter`. Check `instanceof FileSystemAdapter` before calling `getBasePath()`.
- Long lists (icons, CSS variables, commands) use `lib/ui/virtual-list.ts`. Do not render every row into the DOM.
- Event spy owns no sink. Do not give it its own file writer; it records through `lib.diagnostics`.
