export interface ReloaderSettings {
	enabled: boolean;
	// Saved dev plugins. Picked by name in settings, persisted by id.
	devPluginIds: string[];
	// Watch the saved dev plugins' folders and reload on rebuild.
	autoWatch: boolean;
	// Coalesce the burst of file events a single build emits into one reload.
	watchDebounceMs: number;
	// Surface a Notice on every watcher event and every reload. Default on:
	// the whole point of this tool is that a silent watcher failure becomes
	// a visible one.
	showDiagnostics: boolean;
	// Append every watcher and reload event to a timestamped markdown file.
	// Opt-in: useful for verifying the watcher fires and spotting phantom events.
	writeLog: boolean;
	logPath: string;
}

export const DEFAULT_RELOADER_SETTINGS: ReloaderSettings = {
	enabled: true,
	devPluginIds: [],
	autoWatch: false,
	watchDebounceMs: 250,
	showDiagnostics: true,
	writeLog: false,
	logPath: "dev-tools/dev-logs/reloader-log.md",
};
