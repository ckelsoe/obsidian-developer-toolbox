import { App, PluginSettingTab, Setting, type SettingDefinitionItem, type SettingGroupItem } from "obsidian";
import type DeveloperToolboxPlugin from "./main";
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

	getSettingDefinitions(): SettingDefinitionItem[] {
		const defs: SettingDefinitionItem[] = [
			{
				name: "Storage folder",
				desc: "Root folder for all tool output. Each tool saves into a subfolder of this. Changing it takes effect for new output; reopen this tab to refresh the subfolder paths shown below.",
				control: { type: "text", key: "storageRoot" },
			},
		];

		for (const tool of this.plugin.tools) {
			const items: SettingGroupItem[] = [
				{
					name: "Enabled",
					desc: "Turn this tool's commands, ribbon icons, and side effects on or off.",
					control: { type: "toggle", key: `tool:${tool.id}:enabled` },
				},
			];

			// A tool's own settings are arbitrary imperative DOM, so they live in
			// a render row that shows only while the tool is enabled. Render rows
			// are not search-indexable; the enabled toggle and heading are.
			if (tool.renderSettings) {
				items.push({
					name: "",
					searchable: false,
					visible: () =>
						this.plugin.data.tools[tool.id]?.enabled ?? tool.defaultSettings.enabled,
					render: (setting: Setting) => {
						const host = setting.settingEl;
						host.empty();
						host.addClass("toolbox-tool-body-block");
						const body = host.createDiv({ cls: "toolbox-tool-body" });
						tool.renderSettings?.(body, this.plugin.buildContext(tool));
					},
				});
			}

			defs.push({ type: "group", heading: tool.displayName, items });
		}

		defs.push({
			name: "",
			searchable: false,
			render: (setting: Setting) => {
				this.renderFooter(setting);
			},
		});

		return defs;
	}

	// Routes declarative controls to the toolbox's nested data store (storageRoot
	// plus a per-tool enabled flag under data.tools[id]). Tool-body fields are not
	// declarative controls; they persist themselves through buildContext, so they
	// never reach these methods.
	getControlValue(key: string): unknown {
		if (key === "storageRoot") {
			return this.plugin.data.storageRoot;
		}
		const id = this.toolIdFromKey(key);
		if (id !== null) {
			const tool = this.plugin.tools.find((t) => t.id === id);
			return this.plugin.data.tools[id]?.enabled ?? tool?.defaultSettings.enabled ?? false;
		}
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "storageRoot") {
			this.plugin.data.storageRoot =
				(typeof value === "string" ? value.trim() : "") || "_dev-tools";
			await saveSettings(this.plugin);
			return;
		}

		const id = this.toolIdFromKey(key);
		if (id === null) return;

		const tool = this.plugin.tools.find((t) => t.id === id);
		const stored: ToolStoredSettings = this.plugin.data.tools[id] ?? {
			...(tool?.defaultSettings ?? { enabled: false }),
		};
		stored.enabled = Boolean(value);
		this.plugin.data.tools[id] = stored;
		await saveSettings(this.plugin);

		if (tool) {
			if (stored.enabled) this.plugin.enableTool(tool);
			else this.plugin.disableTool(tool);
		}
		// Enabling or disabling a tool shows or hides its settings body.
		this.update();
	}

	// Parse a `tool:<id>:enabled` control key back to the tool id, or null when
	// the key is not a per-tool enabled toggle.
	private toolIdFromKey(key: string): string | null {
		const match = /^tool:(.+):enabled$/.exec(key);
		return match?.[1] ?? null;
	}

	// Renders the version + GitHub link footer into a trailing settings row.
	private renderFooter(setting: Setting): void {
		const footer = setting.settingEl;
		footer.empty();
		footer.addClass("toolbox-version-footer");
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
}
