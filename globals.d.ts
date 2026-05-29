import "obsidian";

declare module "obsidian" {
	interface App {
		appVersion?: string;
		plugins: {
			enabledPlugins: Set<string>;
			plugins: Record<string, unknown>;
			manifests: Record<string, PluginManifest>;
			enablePlugin(id: string): Promise<void>;
			disablePlugin(id: string): Promise<void>;
			loadManifests?(): Promise<void>;
		};
	}

	interface PluginManifest {
		version: string;
	}
}
