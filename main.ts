import { Plugin } from "obsidian";
import { loadSettings, saveSettings, ToolboxData, ToolboxSettingTab } from "./settings";
import { buildLib } from "./lib";
import type { ToolboxLib } from "./lib/types";
import type { Disposable, ToolContext, ToolHandle } from "./tools/types";

import issueCapture from "./tools/issue-capture";
import reloader from "./tools/reloader";
import stateInspector from "./tools/state-inspector";
import iconBrowser from "./tools/icon-browser";
import cssVarInspector from "./tools/css-var-inspector";

const TOOLS: ToolHandle[] = [
	issueCapture,
	reloader,
	stateInspector,
	iconBrowser,
	cssVarInspector,
];

export default class DeveloperToolboxPlugin extends Plugin {
	data!: ToolboxData;
	lib!: ToolboxLib;
	tools: ToolHandle[] = TOOLS;
	private active = new Map<string, Disposable>();

	async onload(): Promise<void> {
		this.data = await loadSettings(this);
		this.lib = buildLib(this);

		for (const tool of this.tools) {
			const stored = this.data.tools[tool.id];
			// Merge defaults under any stored values so newly added settings keys
			// are never undefined for an existing install (which would throw when
			// passed to normalizePath and similar). Stored values win.
			const merged = { ...tool.defaultSettings, ...(stored ?? {}) };
			const changed = !stored || JSON.stringify(merged) !== JSON.stringify(stored);
			this.data.tools[tool.id] = merged;
			if (changed) {
				await saveSettings(this);
			}
			if (this.data.tools[tool.id]?.enabled) {
				this.enableTool(tool);
			}
		}

		this.addSettingTab(new ToolboxSettingTab(this.app, this));
	}

	onunload(): void {
		for (const d of this.active.values()) d.dispose();
		this.active.clear();
	}

	enableTool(tool: ToolHandle): void {
		if (this.active.has(tool.id)) return;
		const disposable = tool.register(this.buildContext(tool));
		this.active.set(tool.id, disposable);
	}

	disableTool(tool: ToolHandle): void {
		const d = this.active.get(tool.id);
		if (!d) return;
		d.dispose();
		this.active.delete(tool.id);
	}

	buildContext<T extends { enabled: boolean }>(tool: ToolHandle<T>): ToolContext<T> {
		const settings = this.data.tools[tool.id] as unknown as T;
		return {
			app: this.app,
			plugin: this,
			lib: this.lib,
			settings,
			saveSettings: () => saveSettings(this),
		};
	}
}
