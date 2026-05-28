import { App, PluginSettingTab, Setting } from "obsidian";
import type DeveloperToolboxPlugin from "./main";
import type { ToolHandle } from "./tools/types";

export interface ToolStoredSettings {
	enabled: boolean;
	[key: string]: unknown;
}

export interface ToolboxData {
	version: 1;
	tools: Record<string, ToolStoredSettings>;
}

const DEFAULT_DATA: ToolboxData = {
	version: 1,
	tools: {},
};

export async function loadSettings(plugin: DeveloperToolboxPlugin): Promise<ToolboxData> {
	const raw = (await plugin.loadData()) as Partial<ToolboxData> | null;
	if (!raw) return structuredClone(DEFAULT_DATA);
	const version = raw.version === 1 ? 1 : 1;
	return {
		version,
		tools: { ...(raw.tools ?? {}) },
	};
}

export async function saveSettings(plugin: DeveloperToolboxPlugin): Promise<void> {
	await plugin.saveData(plugin.data);
}

export class ToolboxSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: DeveloperToolboxPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		for (const tool of this.plugin.tools) {
			this.renderToolSection(containerEl, tool);
		}
	}

	private renderToolSection(parent: HTMLElement, tool: ToolHandle): void {
		const section = parent.createDiv({ cls: "toolbox-tool-section" });

		new Setting(section)
			.setName(tool.displayName)
			.setHeading();

		const storedDefaults = tool.defaultSettings;
		const stored: ToolStoredSettings = this.plugin.data.tools[tool.id] ?? storedDefaults;

		new Setting(section)
			.setName("Enabled")
			.setDesc("Turn this tool's commands, ribbon icons, and side effects on or off.")
			.addToggle((toggle) => {
				toggle
					.setValue(stored.enabled)
					.onChange(async (value) => {
						stored.enabled = value;
						this.plugin.data.tools[tool.id] = stored;
						await saveSettings(this.plugin);
						if (value) this.plugin.enableTool(tool);
						else this.plugin.disableTool(tool);
						this.display();
					});
			});

		if (stored.enabled && tool.renderSettings) {
			const body = section.createDiv({ cls: "toolbox-tool-body" });
			tool.renderSettings(body, this.plugin.buildContext(tool));
		}
	}
}
