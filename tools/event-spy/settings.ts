import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import { saveSettings } from "../../settings";
import type { EventSpySettings } from "./types";

type Ctx = ToolContext<EventSpySettings>;

export function renderEventSpySettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Watch workspace events")
		.setDesc("Record file open, active leaf change, and layout change.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.workspaceEvents).onChange(async (value) => {
				ctx.settings.workspaceEvents = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Watch editor changes")
		.setDesc("Record editor-change. Noisy: this fires on every keystroke.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.editorChanges).onChange(async (value) => {
				ctx.settings.editorChanges = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container)
		.setName("Watch vault events")
		.setDesc("Record file create, modify, delete, and rename.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.vaultEvents).onChange(async (value) => {
				ctx.settings.vaultEvents = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container).setDesc(
		"Recording requires the diagnostics log tool to be enabled. With it off, observed events are dropped.",
	);
}
