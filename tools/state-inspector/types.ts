// State inspector reuses the issue-capture context options 1:1, so the snapshot
// respects the same privacy choices (CaptureContextOpts, lib/types.ts).
export interface StateInspectorSettings {
	enabled: boolean;
	includeVaultName: boolean;
	includePluginList: boolean;
	pathStyle: "basename" | "vault-relative" | "absolute";
}

export const DEFAULT_STATE_INSPECTOR_SETTINGS: StateInspectorSettings = {
	enabled: true,
	includeVaultName: true,
	includePluginList: true,
	pathStyle: "vault-relative",
};
