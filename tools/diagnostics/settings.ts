import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import { saveSettings } from "../../settings";
import type { DiagnosticsSettings } from "./types";
import { DIAGNOSTICS_LOG_FILENAME } from "./types";

type Ctx = ToolContext<DiagnosticsSettings>;

export function renderDiagnosticsSettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Log subfolder")
		.setDesc(
			`Saved inside the storage folder: ${ctx.plugin.data.storageRoot}/ (file: ${DIAGNOSTICS_LOG_FILENAME})`,
		)
		.addText((t) => {
			t.setValue(ctx.settings.logSubfolder);
			t.onChange(async (value) => {
				ctx.settings.logSubfolder = value.trim() || "dev-diagnostics";
				await saveSettings(ctx.plugin);
			});
		})
		.addButton((btn) => {
			btn.setButtonText("Open log").onClick(() => {
				const path = ctx.lib.storage.resolve(
					`${ctx.settings.logSubfolder || "dev-diagnostics"}/${DIAGNOSTICS_LOG_FILENAME}`,
				);
				if (ctx.app.vault.getFileByPath(path)) {
					void ctx.app.workspace.openLinkText(path, "");
				}
			});
		});

	new Setting(container)
		.setName("Log session start")
		.setDesc("Record an environment snapshot entry each time the tool loads.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.logSessionStart).onChange(async (value) => {
				ctx.settings.logSessionStart = value;
				await saveSettings(ctx.plugin);
			});
		});
}
