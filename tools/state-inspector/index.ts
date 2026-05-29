import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_STATE_INSPECTOR_SETTINGS, type StateInspectorSettings } from "./types";
import { StateInspectorModal } from "./modal";
import { renderStateInspectorSettings } from "./settings";

type Ctx = ToolContext<StateInspectorSettings>;

const stateInspector: ToolHandle<StateInspectorSettings> = {
	id: "state-inspector",
	displayName: "State inspector",
	defaultSettings: DEFAULT_STATE_INSPECTOR_SETTINGS,

	register(ctx: Ctx): Disposable {
		const open = (): void => {
			new StateInspectorModal(ctx.app, ctx.plugin, {
				settings: ctx.settings,
				lib: ctx.lib,
			}).open();
		};

		const ribbon = ctx.plugin.addRibbonIcon("activity", "Inspect live state", () => open());

		ctx.plugin.addCommand({
			id: "inspect-live-state",
			name: "Inspect live state",
			callback: () => open(),
		});

		return {
			dispose: (): void => {
				ribbon.detach();
			},
		};
	},

	renderSettings(container: HTMLElement, ctx: Ctx): void {
		renderStateInspectorSettings(container, ctx);
	},
};

export default stateInspector;
