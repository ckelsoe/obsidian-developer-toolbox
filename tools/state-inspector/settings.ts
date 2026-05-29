import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import { saveSettings } from "../../settings";
import type { StateInspectorSettings } from "./types";

type Ctx = ToolContext<StateInspectorSettings>;

export function renderStateInspectorSettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Include vault name")
		.setDesc("Show the vault name in the snapshot.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.includeVaultName).onChange(async (value) => {
				ctx.settings.includeVaultName = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Include plugin list")
		.setDesc("Show the enabled community plugins in the snapshot.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.includePluginList).onChange(async (value) => {
				ctx.settings.includePluginList = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Path style")
		.setDesc("How the active file path appears in the snapshot.")
		.addDropdown((dd) => {
			dd.addOption("basename", "Filename only");
			dd.addOption("vault-relative", "Vault-relative");
			dd.addOption("absolute", "Absolute (home-redacted)");
			dd.setValue(ctx.settings.pathStyle);
			dd.onChange(async (value) => {
				ctx.settings.pathStyle = value as StateInspectorSettings["pathStyle"];
				await saveSettings(ctx.plugin);
			});
		});
}
