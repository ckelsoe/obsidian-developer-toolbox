import { Notice } from "obsidian";
import type { Disposable, ToolContext, ToolHandle } from "../types";
import { readPluginVersionFromDisk } from "../../lib/manifest-version";
import { DEFAULT_RELOADER_SETTINGS, type ReloaderSettings } from "./types";
import { PluginPickerModal } from "./picker";
import { renderReloaderSettings } from "./settings";
import {
	ReloaderController,
	clearActiveController,
	setActiveController,
} from "./controller";

type Ctx = ToolContext<ReloaderSettings>;

// Grace after layout-ready before arming the file watch, so startup file I/O
// settles first. Short enough that a dev is not rebuilding within it.
const ARM_GRACE_MS = 1500;

const reloader: ToolHandle<ReloaderSettings> = {
	id: "reloader",
	displayName: "Plugin reloader",
	defaultSettings: DEFAULT_RELOADER_SETTINGS,

	register(ctx: Ctx): Disposable {
		const controller = new ReloaderController(ctx);
		setActiveController(controller);

		// Ribbon doubles as a status light: amber when a watched file changed
		// and a reload is pending, green flash right after a reload. Clicking
		// reloads the configured dev plugins and clears the pending state.
		const ribbon = ctx.plugin.addRibbonIcon(
			"refresh-cw",
			"Reload dev plugins",
			() => void controller.reloadDevPlugins(),
		);
		controller.attachIcon(ribbon);

		// Always-visible text indicator in the status bar. Clicking it reloads
		// the dev plugins, same as the ribbon.
		const statusBar = ctx.plugin.addStatusBarItem();
		ctx.plugin.registerDomEvent(statusBar, "click", () =>
			void controller.reloadDevPlugins(),
		);
		controller.attachStatusBar(statusBar);

		// Arm after layout-ready plus a short grace so startup file I/O settles
		// before the watch exists (avoids a phantom-event no-op reload on launch).
		controller.startDeferred(ARM_GRACE_MS);

		// Fire the moment the new build runs, so a reload visibly self-confirms.
		// Read the version from disk: Obsidian's in-memory manifest is stale after
		// a live reload of the toolbox itself.
		if (ctx.settings.showDiagnostics) {
			void readPluginVersionFromDisk(ctx.app, ctx.plugin.manifest.id).then((v) => {
				new Notice(
					`Reloader ready (Developer Toolbox v${v ?? ctx.plugin.manifest.version}).`,
					3000,
				);
			});
		}

		ctx.plugin.addCommand({
			id: "reload-plugin",
			name: "Reload plugin",
			callback: () => {
				new PluginPickerModal(
					ctx.app,
					(id) => void controller.reloadById(id),
					"Select a plugin to reload",
				).open();
			},
		});
		ctx.plugin.addCommand({
			id: "reload-dev-plugins",
			name: "Reload dev plugins",
			callback: () => void controller.reloadDevPlugins(),
		});

		return {
			dispose: (): void => {
				controller.dispose();
				clearActiveController(controller);
				ribbon.detach();
			},
		};
	},

	renderSettings(container: HTMLElement, ctx: Ctx): void {
		renderReloaderSettings(container, ctx);
	},
};

export default reloader;
