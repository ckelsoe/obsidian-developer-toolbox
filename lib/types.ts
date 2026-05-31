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

export interface DiagnosticsEntry {
	label: string;
	status: "ok" | "error" | "info";
	elapsedMs: number | null;
	timestamp: string;
	body: string | null;
}

export interface DiagnosticsBus {
	append(
		label: string,
		opts?: {
			status?: "ok" | "error" | "info";
			elapsedMs?: number;
			body?: string | Record<string, unknown>;
		},
	): void;
	appendError(label: string, error: unknown, opts?: { elapsedMs?: number }): void;
	// Stores the sink and returns a detach function that clears it. Only the
	// diagnostics tool attaches a sink; with no sink, entries are dropped.
	attachSink(sink: (entry: DiagnosticsEntry) => void): () => void;
	hasSink(): boolean;
}

export interface ToolboxLib {
	clipboard: { writeText(text: string): Promise<void> };
	context: { capture(opts?: Partial<CaptureContextOpts>): CapturedContext };
	diagnostics: DiagnosticsBus;
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
