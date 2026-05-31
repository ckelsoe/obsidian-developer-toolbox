import { TFile, type App } from "obsidian";
import type { DiagnosticsSettings } from "./types";
import { DIAGNOSTICS_LOG_FILENAME } from "./types";
import type { DiagnosticsEntry, ToolboxLib } from "../../lib/types";
import { ensureVaultFolder } from "../../lib/vault-paths";
import { formatSection } from "./format";

const LOG_HEADER = "# Developer Toolbox diagnostics log\n\n";

// Append-only markdown ledger of diagnostics entries. Writes are serialized
// through a promise chain so a burst of entries cannot interleave partial
// sections. Reads the path from settings each call, so changing the subfolder
// takes effect without restarting the tool.
export class DiagnosticsLog {
	private chain: Promise<void> = Promise.resolve();

	constructor(
		private app: App,
		private settings: DiagnosticsSettings,
		private lib: ToolboxLib,
	) {}

	get path(): string {
		const sub = this.settings.logSubfolder || "dev-diagnostics";
		return this.lib.storage.resolve(`${sub}/${DIAGNOSTICS_LOG_FILENAME}`);
	}

	appendEntry(entry: DiagnosticsEntry): void {
		const section = formatSection(entry);
		this.chain = this.chain.then(() => this.write(section)).catch(() => {
			// A failed log write must never throw out of the diagnostics sink.
		});
	}

	private async write(section: string): Promise<void> {
		const path = this.path;
		const file = this.app.vault.getFileByPath(path);
		if (file instanceof TFile) {
			await this.app.vault.append(file, section);
			return;
		}
		const slash = path.lastIndexOf("/");
		if (slash > 0) await ensureVaultFolder(this.app, path.slice(0, slash));
		await this.app.vault.create(path, LOG_HEADER + section);
	}

	async read(): Promise<string> {
		const file = this.app.vault.getFileByPath(this.path);
		if (file instanceof TFile) return this.app.vault.read(file);
		return "";
	}

	async clear(): Promise<void> {
		const path = this.path;
		const file = this.app.vault.getFileByPath(path);
		if (file instanceof TFile) {
			await this.app.vault.modify(file, LOG_HEADER);
			return;
		}
		const slash = path.lastIndexOf("/");
		if (slash > 0) await ensureVaultFolder(this.app, path.slice(0, slash));
		await this.app.vault.create(path, LOG_HEADER);
	}
}
