import type { CssVar } from "./types";

// Pure formatting/filtering (no DOM), unit-testable like state-inspector/format.ts.

// Case-insensitive substring match on either the variable name or its value, so
// you can search for "--background" or for a color like "#fff". Empty query
// returns the list unchanged.
export function filterCssVars(vars: CssVar[], query: string): CssVar[] {
	const q = query.trim().toLowerCase();
	if (!q) return vars;
	return vars.filter(
		(v) => v.name.toLowerCase().includes(q) || v.value.toLowerCase().includes(q),
	);
}

// A copyable, paste-ready declaration. An empty value is preserved as an empty
// declaration so the line still round-trips as valid CSS.
export function formatVarLine(v: CssVar): string {
	return `${v.name}: ${v.value};`;
}

export function formatBlob(vars: CssVar[]): string {
	return vars.map(formatVarLine).join("\n");
}
