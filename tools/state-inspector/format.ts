import type { CapturedContext } from "../../lib/types";

// Pure formatting module (no Obsidian import), unit-testable like payload.ts.
// Turns a CapturedContext into per-field copy strings and a whole-blob dump.

export interface FieldRow {
	key: keyof CapturedContext;
	label: string;
}

// Display order for the inspector. Sentence-case labels (scorecard rule).
export const FIELD_ROWS: FieldRow[] = [
	{ key: "obsidianVersion", label: "Obsidian version" },
	{ key: "electronVersion", label: "Electron version" },
	{ key: "osFamily", label: "Operating system" },
	{ key: "vaultName", label: "Vault name" },
	{ key: "activeFile", label: "Active file" },
	{ key: "activeViewMode", label: "View mode" },
	{ key: "activeLeafType", label: "Leaf type" },
	{ key: "enabledPluginIds", label: "Enabled plugins" },
];

// A null string field means the capture option that produces it is off
// (vaultName, enabledPluginIds) or nothing is open (activeFile, activeLeafType).
// "unknown" view mode reads better hidden than echoed.
function placeholder(key: keyof CapturedContext): string {
	switch (key) {
		case "vaultName":
			return "(not included)";
		case "enabledPluginIds":
			return "(not included)";
		case "activeFile":
			return "(no active file)";
		case "activeLeafType":
			return "(no active leaf)";
		default:
			return "(none)";
	}
}

// The human-readable value for a single field, used both in the row display and
// as the per-field copy payload.
export function formatFieldValue(context: CapturedContext, key: keyof CapturedContext): string {
	const value = context[key];

	if (key === "enabledPluginIds") {
		const ids = context.enabledPluginIds;
		if (ids === null) return placeholder(key);
		if (ids.length === 0) return "0";
		return `${ids.length}\n${ids.join("\n")}`;
	}

	if (key === "activeViewMode") {
		return context.activeViewMode === "unknown" ? "(unknown)" : context.activeViewMode;
	}

	if (value === null) return placeholder(key);
	return String(value);
}

// A short one-line value for the row description (the plugin list collapses to a
// count so the row stays single-line; the full list is in the blob and the
// per-field copy).
export function formatRowSummary(context: CapturedContext, key: keyof CapturedContext): string {
	if (key === "enabledPluginIds") {
		const ids = context.enabledPluginIds;
		if (ids === null) return placeholder(key);
		return `${ids.length}`;
	}
	return formatFieldValue(context, key);
}

// The whole snapshot as one copyable block: one "Label: value" line per field,
// with the plugin list expanded underneath its count.
export function formatBlob(context: CapturedContext): string {
	const lines: string[] = [];
	for (const row of FIELD_ROWS) {
		if (row.key === "enabledPluginIds") {
			const ids = context.enabledPluginIds;
			if (ids === null) {
				lines.push(`${row.label}: ${placeholder(row.key)}`);
			} else {
				lines.push(`${row.label} (${ids.length}):`);
				for (const id of ids) lines.push(`  ${id}`);
			}
			continue;
		}
		lines.push(`${row.label}: ${formatFieldValue(context, row.key)}`);
	}
	return lines.join("\n");
}
