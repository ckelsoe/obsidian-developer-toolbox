import { MarkdownView, Platform } from "obsidian";
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
	// `App.appVersion` is undefined in Obsidian 1.12.7 (spike-verified 2026-05-28).
	// The userAgent regex is the only reliable path. The obsidianmd/platform
	// lint rule targets OS detection via navigator; here we use it for the
	// Obsidian app version, not the OS.
	// eslint-disable-next-line obsidianmd/platform -- userAgent used for app version, not OS
	const match = navigator.userAgent.match(/obsidian\/([\d.]+)/i);
	return match?.[1] ?? "unknown";
}

function detectViewMode(plugin: DeveloperToolboxPlugin): CapturedContext["activeViewMode"] {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return "unknown";
	const mode = view.getMode();
	if (mode === "source") {
		const state = view.getState() as { source?: boolean } | undefined;
		if (state?.source === false) return "live-preview";
		return "source";
	}
	if (mode === "preview") return "preview";
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
