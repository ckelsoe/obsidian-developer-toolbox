import type { App } from "obsidian";
import { readPluginVersionFromDisk } from "../../lib/manifest-version";

export interface ReloadResult {
	id: string;
	name: string;
	version?: string;
	ok: boolean;
	error?: string;
}

export function reloadedLabel(result: ReloadResult): string {
	return result.version ? `${result.name} v${result.version}` : result.name;
}

// The reload primitive. disablePlugin is safe to skip when the plugin is not
// currently enabled; enablePlugin re-reads main.js from disk, which is what
// makes the new build take effect. These are internal Obsidian APIs typed in
// globals.d.ts.
//
// Between disable and enable we re-scan manifests from disk via the internal
// loadManifests(), so Obsidian's cached manifest (and the version it shows in
// the Community plugins list) reflects the freshly built file rather than the
// value cached at startup. Best-effort: guarded in case the internal method is
// absent in a future Obsidian version.
export async function reloadPlugin(app: App, id: string): Promise<ReloadResult> {
	const name = app.plugins.manifests[id]?.name ?? id;
	try {
		if (app.plugins.enabledPlugins.has(id)) {
			await app.plugins.disablePlugin(id);
		}
		if (typeof app.plugins.loadManifests === "function") {
			try {
				await app.plugins.loadManifests();
			} catch {
				// Manifest cache refresh is best-effort; reload still proceeds.
			}
		}
		await app.plugins.enablePlugin(id);
		const version =
			(await readPluginVersionFromDisk(app, id)) ?? app.plugins.manifests[id]?.version;
		return { id, name: app.plugins.manifests[id]?.name ?? name, version, ok: true };
	} catch (e) {
		return { id, name, ok: false, error: (e as Error).message };
	}
}
