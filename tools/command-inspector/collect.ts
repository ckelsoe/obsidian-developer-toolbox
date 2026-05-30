// Pure command-row building (no Obsidian import). Uses structural input types so
// it is unit-testable in plain node, while still accepting Obsidian's real
// Command / Hotkey / PluginManifest objects at runtime (they structurally satisfy
// these shapes).

export interface HotkeyLike {
	modifiers: string[];
	key: string;
}

export interface CommandLike {
	id: string;
	name: string;
	hotkeys?: HotkeyLike[];
}

export interface ManifestLike {
	name: string;
}

export interface CommandRow {
	id: string;
	owningPlugin: string;
	action: string;
	hotkeys: string[];
}

// Owning plugin from the id prefix. addCommand prefixes ids as
// `<plugin-id>:<action>` (Plugin.md:39, obsidian.d.ts:4884-4886). Core commands
// use namespaces like app:/editor:/workspace: that are not in plugins.manifests,
// so fall back to the raw prefix rather than implying a missing plugin.
export function deriveOwning(
	id: string,
	manifests: Record<string, ManifestLike>,
): { owningPlugin: string; action: string } {
	const idx = id.indexOf(":");
	const prefix = idx === -1 ? id : id.slice(0, idx);
	const action = idx === -1 ? id : id.slice(idx + 1);
	const owningPlugin = manifests[prefix]?.name ?? prefix;
	return { owningPlugin, action };
}

// "Mod+Shift+P" style. Modifiers are kept verbatim (including the platform-neutral
// "Mod") so the displayed binding matches what Obsidian stores.
export function formatHotkey(h: HotkeyLike): string {
	return [...h.modifiers, h.key].join("+");
}

// Effective binding precedence: a user override wins (even an explicit empty
// override, which means the user cleared the binding), else the app default, else
// the command's plugin-declared default, else none.
function effectiveHotkeys(
	id: string,
	command: CommandLike,
	customKeys: Record<string, HotkeyLike[]>,
	defaultKeys: Record<string, HotkeyLike[]>,
): HotkeyLike[] {
	if (id in customKeys) return customKeys[id] ?? [];
	if (id in defaultKeys) return defaultKeys[id] ?? [];
	return command.hotkeys ?? [];
}

export function buildCommandRows(
	commands: Record<string, CommandLike>,
	manifests: Record<string, ManifestLike>,
	customKeys: Record<string, HotkeyLike[]>,
	defaultKeys: Record<string, HotkeyLike[]>,
): CommandRow[] {
	const rows: CommandRow[] = [];
	for (const id of Object.keys(commands)) {
		const command = commands[id];
		if (!command) continue;
		const { owningPlugin, action } = deriveOwning(id, manifests);
		const hotkeys = effectiveHotkeys(id, command, customKeys, defaultKeys).map(formatHotkey);
		rows.push({ id, owningPlugin, action, hotkeys });
	}
	return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export function filterCommands(rows: CommandRow[], query: string): CommandRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter(
		(r) =>
			r.id.toLowerCase().includes(q) ||
			r.owningPlugin.toLowerCase().includes(q) ||
			r.hotkeys.some((h) => h.toLowerCase().includes(q)),
	);
}

// Tab-separated row for the copy-all blob: id, owning plugin, hotkeys (or a marker
// when unbound).
export function formatRow(r: CommandRow): string {
	const hk = r.hotkeys.length ? r.hotkeys.join(", ") : "no hotkey";
	return `${r.id}\t${r.owningPlugin}\t${hk}`;
}

export function formatBlob(rows: CommandRow[]): string {
	return rows.map(formatRow).join("\n");
}
