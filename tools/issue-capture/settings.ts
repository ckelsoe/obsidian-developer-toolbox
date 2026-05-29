import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import { ISSUE_TYPES, type IssueCaptureSettings, type IssueType } from "./types";
import { saveSettings } from "../../settings";

type Ctx = ToolContext<IssueCaptureSettings>;

export function renderIssueCaptureSettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Immediate settle")
		.setDesc("Brief pause before an immediate screenshot fires, so the triggering click and its highlight clear. In milliseconds.")
		.addSlider((slider) => {
			slider
				.setLimits(0, 500, 50)
				.setValue(ctx.settings.immediateSettleMs)
				.setDynamicTooltip()
				.onChange(async (value) => {
					ctx.settings.immediateSettleMs = value;
					await saveSettings(ctx.plugin);
				});
		});

	new Setting(container)
		.setName("Delayed countdown")
		.setDesc("Seconds to wait before a delayed screenshot fires. Gives you time to navigate or open a transient UI (menu, tooltip, palette).")
		.addSlider((slider) => {
			slider
				.setLimits(2, 15, 1)
				.setValue(ctx.settings.delayedCaptureSeconds)
				.setDynamicTooltip()
				.onChange(async (value) => {
					ctx.settings.delayedCaptureSeconds = value;
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

	const storageRoot = ctx.plugin.data.storageRoot;

	new Setting(container)
		.setName("Screenshots subfolder")
		.setDesc(`Saved inside the storage folder: ${storageRoot}/`)
		.addText((t) => {
			t.setValue(ctx.settings.screenshotSubfolder);
			t.inputEl.addClass("toolbox-issue-folder-input");
			t.onChange(async (value) => {
				ctx.settings.screenshotSubfolder = value.trim() || "dev-screenshots";
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
		.setName("Issues subfolder")
		.setDesc(`Saved inside the storage folder: ${storageRoot}/`)
		.addText((t) => {
			t.setValue(ctx.settings.issueSubfolder);
			t.inputEl.addClass("toolbox-issue-folder-input");
			t.onChange(async (value) => {
				ctx.settings.issueSubfolder = value.trim() || "dev-issues";
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
