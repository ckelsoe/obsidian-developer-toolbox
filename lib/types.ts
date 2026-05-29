export interface CaptureContextOpts {
	includeVaultName: boolean;
	includePluginList: boolean;
	pathStyle: "basename" | "vault-relative" | "absolute";
}

export interface CapturedContext {
	obsidianVersion: string;
	electronVersion: string;
	osFamily: "windows" | "macos" | "linux";
	vaultName: string | null;
	activeFile: string | null;
	activeViewMode: "source" | "live-preview" | "preview" | "unknown";
	activeLeafType: string | null;
	enabledPluginIds: string[] | null;
}

export interface StackedRowResult {
	row: HTMLElement;
	content: HTMLElement;
}

export interface CountdownNoticeHandle {
	cancel(): void;
	promise: Promise<void>;
}

export interface ToolboxLib {
	clipboard: { writeText(text: string): Promise<void> };
	context: { capture(opts?: Partial<CaptureContextOpts>): CapturedContext };
	pathRedact: {
		home(p: string): string;
		vault(p: string, vaultBase: string): string;
	};
	vaultPaths: {
		ensureFolder(relPath: string): Promise<void>;
		suggestUnique(relPath: string): Promise<string>;
	};
	storage: {
		// The shared root folder for tool output.
		root(): string;
		// Joins the storage root with a subfolder (or sub-path) and normalizes.
		resolve(subpath: string): string;
	};
	ui: {
		stackedRow(parent: HTMLElement, opts: { name: string; description?: string }): StackedRowResult;
		countdownNotice(seconds: number, onTick?: (remaining: number) => void): CountdownNoticeHandle;
	};
}
