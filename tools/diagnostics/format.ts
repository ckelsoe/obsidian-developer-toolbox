import type { DiagnosticsEntry } from "../../lib/types";

// One markdown section per entry. The heading carries the label, the uppercased
// status, an optional elapsed part, and the ISO timestamp, all joined by " · ".
// The body block follows when present. " · " avoids em dashes in code.
export function formatSection(entry: DiagnosticsEntry): string {
	const parts = [entry.label, entry.status.toUpperCase()];
	if (entry.elapsedMs !== null) parts.push(`${entry.elapsedMs} ms`);
	parts.push(entry.timestamp);
	let section = `## ${parts.join(" · ")}\n\n`;
	if (entry.body !== null) section += `${entry.body}\n\n`;
	return section;
}
