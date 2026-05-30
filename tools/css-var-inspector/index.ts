import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_CSS_VAR_INSPECTOR_SETTINGS, type CssVarInspectorSettings } from "./types";
import { CssVarInspectorModal } from "./modal";

type Ctx = ToolContext<CssVarInspectorSettings>;

const cssVarInspector: ToolHandle<CssVarInspectorSettings> = {
	id: "css-var-inspector",
	displayName: "CSS variable inspector",
	defaultSettings: DEFAULT_CSS_VAR_INSPECTOR_SETTINGS,

	register(ctx: Ctx): Disposable {
		const open = (): void => {
			new CssVarInspectorModal(ctx.app, ctx.plugin, { lib: ctx.lib }).open();
		};

		const ribbon = ctx.plugin.addRibbonIcon("paintbrush", "Inspect CSS variables", () => open());

		ctx.plugin.addCommand({
			id: "inspect-css-variables",
			name: "Inspect CSS variables",
			callback: () => open(),
		});

		return {
			dispose: (): void => {
				ribbon.detach();
			},
		};
	},
};

export default cssVarInspector;
