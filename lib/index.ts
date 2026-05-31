import { normalizePath } from "obsidian";
import type DeveloperToolboxPlugin from "../main";
import type { ToolboxLib } from "./types";
import * as clipboard from "./clipboard";
import * as pathRedact from "./path-redact";
import { buildVaultPaths } from "./vault-paths";
import { buildContextCapture } from "./context-capture";
import { buildDiagnosticsBus } from "./diagnostics";
import { stackedRow } from "./ui/stacked-row";
import { countdownNotice } from "./ui/notice";

export function buildLib(plugin: DeveloperToolboxPlugin): ToolboxLib {
	return {
		clipboard,
		context: buildContextCapture(plugin),
		diagnostics: buildDiagnosticsBus(),
		pathRedact: {
			home: pathRedact.redactHome,
			vault: pathRedact.redactVault,
		},
		vaultPaths: buildVaultPaths(plugin),
		storage: {
			root: (): string => plugin.data.storageRoot,
			resolve: (subpath: string): string =>
				normalizePath(`${plugin.data.storageRoot}/${subpath}`),
		},
		ui: {
			stackedRow,
			countdownNotice,
		},
	};
}

export type { ToolboxLib } from "./types";
