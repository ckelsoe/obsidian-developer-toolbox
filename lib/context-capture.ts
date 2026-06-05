import { apiVersion, MarkdownView, Platform } from "obsidian";
import type DeveloperToolboxPlugin from "../main";
import type { CaptureContextOpts, CapturedContext, ToolboxLib } from "./types";
import { redactHome, redactVault } from "./path-redact";

const DEFAULT_OPTS: CaptureContextOpts = {
	includeVaultName: true,
	includePluginList: true,
	pathStyle: "vault-relative",
};

function detectOsFamily(): "windows" | "macos" | "linux" {
	if (Platform.isWin) return "windows";
	if (Platform.isMacOS) return "macos";
	return "linux";
}

function detectObsidianVersion(): string {
	// Obsidian exports `apiVersion` (the installed app version). This is the
	// documented source and avoids sniffing navigator.userAgent (which the
	// obsidianmd/platform rule flags).
	return apiVersion || "unknown";
}

function detectElectronVersion(): string {
	// Obsidian exposes no Electron version API. On desktop, read it from the Node
	// `process` global via globalThis (no navigator sniffing, no node-module
	// import). Mobile has no Electron, so report "unknown" there.
	if (!Platform.isDesktop) return "unknown";
	const proc = (window as { process?: { versions?: { electron?: string } } }).process;
	return proc?.versions?.electron ?? "unknown";
}

function modeFromView(view: MarkdownView): CapturedContext["activeViewMode"] {
	const mode = view.getMode();
	if (mode === "source") {
		const state = view.getState() as { source?: boolean } | undefined;
		return state?.source === false ? "live-preview" : "source";
	}
	if (mode === "preview") return "preview";
	return "unknown";
}

function detectViewMode(plugin: DeveloperToolboxPlugin): CapturedContext["activeViewMode"] {
	const focused = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (focused) return modeFromView(focused);
	const activeFile = plugin.app.workspace.getActiveFile();
	if (!activeFile) return "unknown";
	const leaves = plugin.app.workspace.getLeavesOfType("markdown");
	for (const leaf of leaves) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === activeFile.path) {
			return modeFromView(view);
		}
	}
	return "unknown";
}

function detectLeafType(plugin: DeveloperToolboxPlugin): string | null {
	const leaf = plugin.app.workspace.getMostRecentLeaf();
	return leaf?.view?.getViewType() ?? null;
}

function getEnabledPluginIds(plugin: DeveloperToolboxPlugin): string[] {
	const set = plugin.app.plugins.enabledPlugins;
	return set ? Array.from(set).sort() : [];
}

function getVaultBase(plugin: DeveloperToolboxPlugin): string {
	const adapter = plugin.app.vault.adapter as { basePath?: string; getBasePath?: () => string };
	return adapter.basePath ?? adapter.getBasePath?.() ?? "";
}

export function buildContextCapture(plugin: DeveloperToolboxPlugin): ToolboxLib["context"] {
	return {
		capture(partial: Partial<CaptureContextOpts> = {}): CapturedContext {
			const opts: CaptureContextOpts = { ...DEFAULT_OPTS, ...partial };
			const activeFile = plugin.app.workspace.getActiveFile();
			let renderedActiveFile: string | null = null;
			if (activeFile) {
				switch (opts.pathStyle) {
					case "basename":
						renderedActiveFile = activeFile.name;
						break;
					case "vault-relative":
						renderedActiveFile = activeFile.path;
						break;
					case "absolute": {
						const base = getVaultBase(plugin);
						renderedActiveFile = base ? redactHome(`${base}/${activeFile.path}`) : activeFile.path;
						break;
					}
				}
			}

			let vaultName: string | null = null;
			if (opts.includeVaultName) vaultName = plugin.app.vault.getName();

			let enabledPluginIds: string[] | null = null;
			if (opts.includePluginList) enabledPluginIds = getEnabledPluginIds(plugin);

			return {
				obsidianVersion: detectObsidianVersion(),
				electronVersion: detectElectronVersion(),
				osFamily: detectOsFamily(),
				vaultName,
				activeFile: renderedActiveFile,
				activeViewMode: detectViewMode(plugin),
				activeLeafType: detectLeafType(plugin),
				enabledPluginIds,
			};
		},
	};
}

export { redactHome, redactVault };
