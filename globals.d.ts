import "obsidian";

// Ambient augmentation of Obsidian's App with undocumented internals used by the
// command inspector. Obsidian's own Command/Hotkey/PluginManifest types are
// referenced via inline `import("obsidian").X` so ESLint's no-undef never fires
// on bare type-only identifiers; that avoids needing an eslint-disable here.
declare module "obsidian" {
	interface App {
		appVersion?: string;
		plugins: {
			enabledPlugins: Set<string>;
			plugins: Record<string, unknown>;
			manifests: Record<string, import("obsidian").PluginManifest>;
			enablePlugin(id: string): Promise<void>;
			disablePlugin(id: string): Promise<void>;
			loadManifests?(): Promise<void>;
		};
		// Undocumented internals used by the command inspector (P5). Every member
		// is optional on purpose: their shapes are not in the public typings or
		// docs, so all access must be defensive and degrade gracefully if a future
		// Obsidian build changes them. Confirm at runtime before trusting any one.
		commands?: {
			commands?: Record<string, import("obsidian").Command>;
			editorCommands?: Record<string, import("obsidian").Command>;
			listCommands?(): import("obsidian").Command[];
			findCommand?(id: string): import("obsidian").Command | undefined;
			executeCommandById?(id: string): boolean;
		};
		hotkeyManager?: {
			customKeys?: Record<string, import("obsidian").Hotkey[]>;
			defaultKeys?: Record<string, import("obsidian").Hotkey[]>;
			getHotkeys?(commandId: string): import("obsidian").Hotkey[] | undefined;
			getDefaultHotkeys?(commandId: string): import("obsidian").Hotkey[] | undefined;
		};
	}

	interface PluginManifest {
		version: string;
	}
}
