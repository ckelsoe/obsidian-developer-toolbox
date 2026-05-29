import { App, PluginSettingTab, Setting } from "obsidian";
import type DeveloperToolboxPlugin from "./main";
import type { ToolHandle } from "./tools/types";
import { readPluginVersionFromDisk } from "./lib/manifest-version";

export interface ToolStoredSettings {
	enabled: boolean;
	[key: string]: unknown;
}

export interface ToolboxData {
	version: number;
	tools: Record<string, ToolStoredSettings>;
}

const DATA_VERSION = 2;

const DEFAULT_DATA: ToolboxData = {
	version: DATA_VERSION,
	tools: {},
};

// v2: move the old flat default output paths into the dev-tools/ structure.
// Only touches values still at their old default, so a user's custom path is
// preserved. Idempotent: re-running finds the new values and does nothing.
function migrateToDevTools(tools: Record<string, ToolStoredSettings>): void {
	const issueCapture = tools["issue-capture"];
	if (issueCapture && issueCapture.screenshotFolder === "dev-screenshots") {
		issueCapture.screenshotFolder = "dev-tools/dev-screenshots";
	}
	const reloader = tools["reloader"];
	if (reloader && reloader.logPath === "developer-toolbox-reloader-log.md") {
		reloader.logPath = "dev-tools/dev-logs/reloader-log.md";
	}
}

export async function loadSettings(plugin: DeveloperToolboxPlugin): Promise<ToolboxData> {
	const raw = (await plugin.loadData()) as Partial<ToolboxData> | null;
	if (!raw) return structuredClone(DEFAULT_DATA);
	const tools = { ...(raw.tools ?? {}) };
	if (raw.version !== DATA_VERSION) {
		migrateToDevTools(tools);
	}
	return {
		version: DATA_VERSION,
		tools,
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

		this.renderFooter(containerEl);
	}

	private renderFooter(parent: HTMLElement): void {
		const footer = parent.createDiv({ cls: "toolbox-version-footer" });
		const versionEl = footer.createSpan({
			text: `Developer Toolbox v${this.plugin.manifest.version}`,
		});
		footer.createEl("a", {
			text: "View on GitHub",
			href: "https://github.com/ckelsoe/obsidian-developer-toolbox",
			cls: "toolbox-version-link",
		});
		// The in-memory manifest can be stale after a live reload; show the
		// on-disk version so the footer matches what was actually built.
		void readPluginVersionFromDisk(this.app, this.plugin.manifest.id).then((v) => {
			if (v) versionEl.setText(`Developer Toolbox v${v}`);
		});
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
