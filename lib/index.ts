import type DeveloperToolboxPlugin from "../main";
import type { ToolboxLib } from "./types";
import * as clipboard from "./clipboard";
import * as pathRedact from "./path-redact";
import { buildVaultPaths } from "./vault-paths";
import { buildContextCapture } from "./context-capture";
import { stackedRow } from "./ui/stacked-row";
import { countdownNotice } from "./ui/notice";

export function buildLib(plugin: DeveloperToolboxPlugin): ToolboxLib {
	return {
		clipboard,
		context: buildContextCapture(plugin),
		pathRedact: {
			home: pathRedact.redactHome,
			vault: pathRedact.redactVault,
		},
		vaultPaths: buildVaultPaths(plugin),
		ui: {
			stackedRow,
			countdownNotice,
		},
	};
}

export type { ToolboxLib } from "./types";
