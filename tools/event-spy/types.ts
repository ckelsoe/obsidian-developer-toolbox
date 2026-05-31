export interface EventSpySettings {
	enabled: boolean;
	workspaceEvents: boolean;
	editorChanges: boolean;
	vaultEvents: boolean;
}

// editorChanges defaults off because editor-change fires on every keystroke and
// would flood the diagnostics log.
export const DEFAULT_EVENT_SPY_SETTINGS: EventSpySettings = {
	enabled: true,
	workspaceEvents: true,
	editorChanges: false,
	vaultEvents: true,
};
