import { TFile, normalizePath, type App } from "obsidian";
import type { ReloaderSettings } from "./types";

function nowStamp(): string {
	const d = new Date();
	const p = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
	return (
		`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
		`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
	);
}

const LOG_HEADER = "# Developer Toolbox reloader log\n\n";

// Append-only markdown log of watcher and reload events. Opt-in (settings.writeLog).
// Writes are serialized through a promise chain so a burst of events cannot
// interleave partial lines. Reads the path/toggle from settings each call, so
// changing them takes effect without restarting the tool.
export class ReloadLog {
	private chain: Promise<void> = Promise.resolve();

	constructor(
		private app: App,
		private settings: ReloaderSettings,
	) {}

	get path(): string {
		return normalizePath(this.settings.logPath || "developer-toolbox-reloader-log.md");
	}

	append(message: string): void {
		if (!this.settings.writeLog) return;
		const line = `- ${nowStamp()} — ${message}\n`;
		this.chain = this.chain.then(() => this.write(line)).catch(() => {
			// A failed log write must never break the reload flow.
		});
	}

	private async write(line: string): Promise<void> {
		const file = this.app.vault.getFileByPath(this.path);
		if (file instanceof TFile) {
			await this.app.vault.append(file, line);
		} else {
			await this.app.vault.create(this.path, LOG_HEADER + line);
		}
	}
}
