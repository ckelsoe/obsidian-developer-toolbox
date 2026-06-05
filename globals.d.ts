/* eslint-disable no-undef -- ambient type augmentation: TypeScript resolves obsidian's own Command and Hotkey types inside this `declare module` block, but ESLint's no-undef does not understand type-only references */
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
		// Undocumented internals used by the command inspector (P5). Every member
		// is optional on purpose: their shapes are not in the public typings or
		// docs, so all access must be defensive and degrade gracefully if a future
		// Obsidian build changes them. Confirm at runtime before trusting any one.
		commands?: {
			commands?: Record<string, Command>;
			editorCommands?: Record<string, Command>;
			listCommands?(): Command[];
			findCommand?(id: string): Command | undefined;
			executeCommandById?(id: string): boolean;
		};
		hotkeyManager?: {
			customKeys?: Record<string, Hotkey[]>;
			defaultKeys?: Record<string, Hotkey[]>;
			getHotkeys?(commandId: string): Hotkey[] | undefined;
			getDefaultHotkeys?(commandId: string): Hotkey[] | undefined;
		};
	}

	interface PluginManifest {
		version: string;
	}
}
/* eslint-enable no-undef */
