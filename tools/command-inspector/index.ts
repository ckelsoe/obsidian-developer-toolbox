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

		const ribbon = ctx.plugin.addRibbonIcon("terminal", "Inspect commands", () => open());

		/* eslint-disable obsidianmd/commands/no-command-in-command-id, obsidianmd/commands/no-command-in-command-name -- this tool inspects Obsidian's registered commands, so "commands" is the object of the action, not a redundant label */
		ctx.plugin.addCommand({
			id: "inspect-commands",
			name: "Inspect commands",
			callback: () => open(),
		});
		/* eslint-enable obsidianmd/commands/no-command-in-command-id, obsidianmd/commands/no-command-in-command-name */

		return {
			dispose: (): void => {
				ribbon.detach();
			},
		};
	},
};

export default commandInspector;
