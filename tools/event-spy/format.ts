// Pure helpers that turn the primitives an event handler extracts into the small
// body records recorded on the diagnostics bus. No Obsidian import: the handlers
// pull the primitive fields off the real objects and pass them here, so this
// stays unit-testable in plain node.

export function spyLabel(bus: "workspace" | "vault", event: string): string {
	return `${bus}:${event}`;
}

export function describeFile(
	file: { path?: string; name?: string } | null | undefined,
): Record<string, unknown> {
	return { path: file?.path ?? null };
}

export function describeRename(
	file: { path?: string } | null | undefined,
	oldPath: string,
): Record<string, unknown> {
	return { from: oldPath, to: file?.path ?? null };
}

export function describeLeaf(viewType: string | null): Record<string, unknown> {
	return { viewType };
}
