import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_ICON_BROWSER_SETTINGS, type IconBrowserSettings } from "./types";
import { IconBrowserModal } from "./modal";

type Ctx = ToolContext<IconBrowserSettings>;

const iconBrowser: ToolHandle<IconBrowserSettings> = {
	id: "icon-browser",
	displayName: "Icon browser",
	defaultSettings: DEFAULT_ICON_BROWSER_SETTINGS,

	register(ctx: Ctx): Disposable {
		const open = (): void => {
			new IconBrowserModal(ctx.app, ctx.plugin, { lib: ctx.lib }).open();
		};

		const ribbon = ctx.plugin.addRibbonIcon("palette", "Browse icons", () => open());

		ctx.plugin.addCommand({
			id: "browse-icons",
			name: "Browse icons",
			callback: () => open(),
		});

		return {
			dispose: (): void => {
				ribbon.detach();
			},
		};
	},
};

export default iconBrowser;
