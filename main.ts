import { Plugin } from "obsidian";

export default class DeveloperToolboxPlugin extends Plugin {
	async onload(): Promise<void> {
		// Skeleton dispatcher. Tool registration lands in subsequent commits.
	}

	onunload(): void {
		// All side effects flow through Plugin.add* helpers (auto-disposed by Obsidian)
		// or through per-tool Disposable handles tracked by the dispatcher. Nothing to do here yet.
	}
}
