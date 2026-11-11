import type { App } from 'obsidian';
import type DeveloperToolboxPlugin from '../main';
import type { ToolboxLib } from '../lib/types';

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

// What Obsidian's settings search matches a tool's hand-drawn settings by.
interface SettingsSearch {
	name: string;
	desc: string;
	aliases: string[];
}

export interface ToolHandle<
	TSettings extends { enabled: boolean } = { enabled: boolean },
> {
	id: string;
	displayName: string;
	defaultSettings: TSettings;
	register(ctx: ToolContext<TSettings>): Disposable;
	renderSettings?(container: HTMLElement, ctx: ToolContext<TSettings>): void;
	// Required whenever renderSettings is set, or search cannot find the row.
	settingsSearch?: SettingsSearch;
}
