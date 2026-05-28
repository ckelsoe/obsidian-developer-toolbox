import type { App } from "obsidian";
import type DeveloperToolboxPlugin from "../main";
import type { ToolboxLib } from "../lib/types";

export interface Disposable {
	dispose(): void;
}

export interface ToolContext<TSettings = unknown> {
	app: App;
	plugin: DeveloperToolboxPlugin;
	lib: ToolboxLib;
	settings: TSettings;
	saveSettings: () => Promise<void>;
}

export interface ToolHandle<TSettings extends Record<string, unknown> = Record<string, unknown>> {
	id: string;
	displayName: string;
	defaultSettings: { enabled: boolean } & TSettings;
	register(ctx: ToolContext<{ enabled: boolean } & TSettings>): Disposable;
	renderSettings?(container: HTMLElement, ctx: ToolContext<{ enabled: boolean } & TSettings>): void;
}
