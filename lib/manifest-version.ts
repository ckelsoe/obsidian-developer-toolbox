import { normalizePath, type App } from "obsidian";

// Reads a plugin's version straight from its manifest.json on disk. Obsidian
// populates app.plugins.manifests at startup and does not refresh it on a live
// enablePlugin, so the in-memory version goes stale after a reload. Reading from
// disk reports the freshly built value. Returns undefined if the file is
// missing or unreadable.
export async function readPluginVersionFromDisk(
	app: App,
	id: string,
): Promise<string | undefined> {
	const dir = app.plugins.manifests[id]?.dir;
	if (!dir) return undefined;
	try {
		const raw = await app.vault.adapter.read(normalizePath(`${dir}/manifest.json`));
		return (JSON.parse(raw) as { version?: string }).version;
	} catch {
		return undefined;
	}
}
