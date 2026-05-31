export interface DiagnosticsSettings {
	enabled: boolean;
	// Subfolder of the storage root for the log. File name is fixed.
	logSubfolder: string;
	// Record a session-start entry the first time the tool registers each load.
	logSessionStart: boolean;
}

export const DEFAULT_DIAGNOSTICS_SETTINGS: DiagnosticsSettings = {
	enabled: true,
	logSubfolder: "dev-diagnostics",
	logSessionStart: true,
};

export const DIAGNOSTICS_LOG_FILENAME = "diagnostics-log.md";
