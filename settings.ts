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
	// Root folder for all tool output. Tools save into subfolders of this.
	storageRoot: string;
	tools: Record<string, ToolStoredSettings>;
}

const DATA_VERSION = 3;
const DEFAULT_STORAGE_ROOT = "_dev-tools";

const DEFAULT_DATA: ToolboxData = {
	version: DATA_VERSION,
	storageRoot: DEFAULT_STORAGE_ROOT,
	tools: {},
};

function lastSegment(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	const parts = value.split("/").filter(Boolean);
	return parts[parts.length - 1] ?? null;
}

function folderOf(value: unknown): string | null {
	// "dev-tools/dev-logs/reloader-log.md" -> "dev-logs" (the containing folder).
	if (typeof value !== "string" || !value) return null;
	const parts = value.split("/").filter(Boolean);
	return parts.length >= 2 ? (parts[parts.length - 2] ?? null) : null;
}

// Migrates older settings shapes to the current one. v3 splits the per-tool full
// output paths into a shared storage root plus per-tool subfolder names. Derives
// subfolders from any existing path so a customised folder name is preserved;
// the data files themselves are not moved.
function migrate(data: ToolboxData): void {
	const issueCapture = data.tools["issue-capture"];
	if (issueCapture) {
		if (issueCapture.screenshotSubfolder === undefined) {
			issueCapture.screenshotSubfolder =
				lastSegment(issueCapture.screenshotFolder) ?? "dev-screenshots";
		}
		if (issueCapture.issueSubfolder === undefined) {
			issueCapture.issueSubfolder = lastSegment(issueCapture.issueFolder) ?? "dev-issues";
		}
		delete issueCapture.screenshotFolder;
		delete issueCapture.issueFolder;
	}
	const reloader = data.tools["reloader"];
	if (reloader) {
		if (reloader.logSubfolder === undefined) {
			reloader.logSubfolder = folderOf(reloader.logPath) ?? "dev-logs";
		}
		delete reloader.logPath;
	}
}

export async function loadSettings(plugin: DeveloperToolboxPlugin): Promise<ToolboxData> {
	const raw = (await plugin.loadData()) as Partial<ToolboxData> | null;
	if (!raw) return structuredClone(DEFAULT_DATA);
	const data: ToolboxData = {
		version: DATA_VERSION,
		storageRoot:
			typeof raw.storageRoot === "string" && raw.storageRoot
				? raw.storageRoot
				: DEFAULT_STORAGE_ROOT,
		tools: { ...(raw.tools ?? {}) },
	};
	if (raw.version !== DATA_VERSION) {
		migrate(data);
	}
	return data;
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

		this.renderStorageSetting(containerEl);

		for (const tool of this.plugin.tools) {
			this.renderToolSection(containerEl, tool);
		}

		this.renderFooter(containerEl);
	}

	private renderStorageSetting(parent: HTMLElement): void {
		new Setting(parent)
			.setName("Storage folder")
			.setDesc("Root folder for all tool output. Each tool saves into a subfolder of this. Changing it takes effect for new output; reopen this tab to refresh the subfolder paths shown below.")
			.addText((t) => {
				t.setValue(this.plugin.data.storageRoot);
				t.onChange(async (value) => {
					this.plugin.data.storageRoot = value.trim() || "_dev-tools";
					await saveSettings(this.plugin);
				});
			});
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
