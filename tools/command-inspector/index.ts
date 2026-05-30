import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_COMMAND_INSPECTOR_SETTINGS, type CommandInspectorSettings } from "./types";
import { CommandInspectorModal } from "./modal";

type Ctx = ToolContext<CommandInspectorSettings>;

const commandInspector: ToolHandle<CommandInspectorSettings> = {
	id: "command-inspector",
	displayName: "Command inspector",
	defaultSettings: DEFAULT_COMMAND_INSPECTOR_SETTINGS,

	register(ctx: Ctx): Disposable {
		const open = (): void => {
			new CommandInspectorModal(ctx.app, ctx.plugin, { lib: ctx.lib }).open();
		};

		const ribbon = ctx.plugin.addRibbonIcon("terminal", "Inspect hotkeys and ids", () => open());

		ctx.plugin.addCommand({
			id: "inspect-hotkeys-and-ids",
			name: "Inspect hotkeys and ids",
			callback: () => open(),
		});

		return {
			dispose: (): void => {
				ribbon.detach();
			},
		};
	},
};

export default commandInspector;
