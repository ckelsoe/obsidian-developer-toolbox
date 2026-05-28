import "obsidian";

declare module "obsidian" {
	interface App {
		appVersion?: string;
		plugins: {
			enabledPlugins: Set<string>;
			plugins: Record<string, unknown>;
		};
	}

	interface PluginManifest {
		version: string;
	}
}
