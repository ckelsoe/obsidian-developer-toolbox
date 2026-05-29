import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import { ISSUE_TYPES, type IssueCaptureSettings, type IssueType } from "./types";
import { saveSettings } from "../../settings";

type Ctx = ToolContext<IssueCaptureSettings>;

export function renderIssueCaptureSettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Delayed countdown")
		.setDesc("Seconds to wait before the screenshot fires when you use the delayed command. Gives you time to open a transient UI (menu, tooltip, palette).")
		.addDropdown((dd) => {
			for (const sec of [1, 2, 3, 4, 5, 7, 10]) {
				dd.addOption(String(sec), `${sec} seconds`);
			}
			dd.setValue(String(ctx.settings.delayedCaptureSeconds));
			dd.onChange(async (value) => {
				ctx.settings.delayedCaptureSeconds = Number(value);
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Default issue type")
		.addDropdown((dd) => {
			for (const t of ISSUE_TYPES) dd.addOption(t.id, t.label);
			dd.setValue(ctx.settings.defaultIssueType);
			dd.onChange(async (value) => {
				ctx.settings.defaultIssueType = value as IssueType;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Screenshot folder")
		.setDesc("Vault-relative folder where captured screenshots are saved.")
		.addText((t) => {
			t.setValue(ctx.settings.screenshotFolder);
			t.inputEl.addClass("toolbox-issue-folder-input");
			t.onChange(async (value) => {
				ctx.settings.screenshotFolder = value.trim() || "dev-tools/dev-screenshots";
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Save issue file")
		.setDesc("On copy, also write an issue note to the vault with the details and a link to the screenshot.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.saveIssueFile).onChange(async (value) => {
				ctx.settings.saveIssueFile = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Issue folder")
		.setDesc("Vault-relative folder where issue notes are saved.")
		.addText((t) => {
			t.setValue(ctx.settings.issueFolder);
			t.inputEl.addClass("toolbox-issue-folder-input");
			t.onChange(async (value) => {
				ctx.settings.issueFolder = value.trim() || "dev-tools/dev-issues";
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container).setName("Privacy").setHeading();

	new Setting(container)
		.setName("Redact home directory in paths")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.redactHomePath).onChange(async (value) => {
				ctx.settings.redactHomePath = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Include plugin list in context")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.includePluginList).onChange(async (value) => {
				ctx.settings.includePluginList = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Include vault name in context")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.includeVaultName).onChange(async (value) => {
				ctx.settings.includeVaultName = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Path style")
		.setDesc("How the active file path appears in the payload.")
		.addDropdown((dd) => {
			dd.addOption("basename", "Filename only");
			dd.addOption("vault-relative", "Vault-relative");
			dd.addOption("absolute", "Absolute (home-redacted)");
			dd.setValue(ctx.settings.pathStyle);
			dd.onChange(async (value) => {
				ctx.settings.pathStyle = value as IssueCaptureSettings["pathStyle"];
				await saveSettings(ctx.plugin);
			});
		});
}
