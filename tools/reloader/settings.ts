import { Setting } from "obsidian";
import type { ToolContext } from "../types";
import type { ReloaderSettings } from "./types";
import { saveSettings } from "../../settings";
import { PluginPickerModal } from "./picker";
import { restartActiveWatcher } from "./controller";

type Ctx = ToolContext<ReloaderSettings>;

export function renderReloaderSettings(container: HTMLElement, ctx: Ctx): void {
	new Setting(container)
		.setName("Auto-reload on rebuild")
		.setDesc("When on, a detected change reloads the plugin right away. When off, the ribbon icon turns amber to flag that a reload is pending.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.autoWatch).onChange(async (value) => {
				ctx.settings.autoWatch = value;
				await saveSettings(ctx.plugin);
				restartActiveWatcher();
			});
		});

	new Setting(container)
		.setName("Reload debounce")
		.setDesc("How long to wait after a file change before reloading. Coalesces the burst of writes a single build emits.")
		.addDropdown((dd) => {
			for (const ms of [100, 250, 500, 1000]) {
				dd.addOption(String(ms), `${ms} ms`);
			}
			dd.setValue(String(ctx.settings.watchDebounceMs));
			dd.onChange(async (value) => {
				ctx.settings.watchDebounceMs = Number(value);
				await saveSettings(ctx.plugin);
				restartActiveWatcher();
			});
		});

	new Setting(container)
		.setName("Show diagnostics")
		.setDesc("Surface a notice on every watcher start and reload. Leave on so a silent watcher failure is visible.")
		.addToggle((toggle) => {
			toggle.setValue(ctx.settings.showDiagnostics).onChange(async (value) => {
				ctx.settings.showDiagnostics = value;
				await saveSettings(ctx.plugin);
			});
		});

	new Setting(container).setName("Dev plugins").setHeading();

	const listEl = container.createDiv({ cls: "toolbox-reloader-list" });
	renderDevList(listEl, ctx);

	new Setting(container)
		.setName("Add dev plugin")
		.setDesc("Pick by name. The plugin ID is stored for you.")
		.addButton((btn) => {
			btn.setButtonText("Add").onClick(() => {
				new PluginPickerModal(
					ctx.app,
					(id) => void addDevPlugin(listEl, ctx, id),
					"Add a plugin to watch and reload",
				).open();
			});
		});
}

function renderDevList(listEl: HTMLElement, ctx: Ctx): void {
	listEl.empty();
	const ids = ctx.settings.devPluginIds;
	if (!ids.length) {
		listEl.createEl("p", {
			text: "No dev plugins yet. Add one below.",
			cls: "toolbox-reloader-empty",
		});
		return;
	}
	for (const id of ids) {
		const name = ctx.app.plugins.manifests[id]?.name ?? id;
		new Setting(listEl)
			.setName(name)
			.setDesc(id)
			.addButton((btn) => {
				btn
					.setButtonText("Remove")
					.setWarning()
					.onClick(() => void removeDevPlugin(listEl, ctx, id));
			});
	}
}

async function addDevPlugin(listEl: HTMLElement, ctx: Ctx, id: string): Promise<void> {
	if (!ctx.settings.devPluginIds.includes(id)) {
		ctx.settings.devPluginIds.push(id);
		await saveSettings(ctx.plugin);
		restartActiveWatcher();
	}
	renderDevList(listEl, ctx);
}

async function removeDevPlugin(listEl: HTMLElement, ctx: Ctx, id: string): Promise<void> {
	ctx.settings.devPluginIds = ctx.settings.devPluginIds.filter((x) => x !== id);
	await saveSettings(ctx.plugin);
	restartActiveWatcher();
	renderDevList(listEl, ctx);
}
