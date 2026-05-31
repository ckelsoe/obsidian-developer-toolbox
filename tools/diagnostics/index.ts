import { Notice, TFile } from "obsidian";
import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_DIAGNOSTICS_SETTINGS, type DiagnosticsSettings } from "./types";
import { DiagnosticsLog } from "./log";
import { renderDiagnosticsSettings } from "./settings";

type Ctx = ToolContext<DiagnosticsSettings>;

const diagnostics: ToolHandle<DiagnosticsSettings> = {
	id: "diagnostics",
	displayName: "Diagnostics log",
	defaultSettings: DEFAULT_DIAGNOSTICS_SETTINGS,

	register(ctx: Ctx): Disposable {
		const log = new DiagnosticsLog(ctx.app, ctx.settings, ctx.lib);
		const detach = ctx.lib.diagnostics.attachSink((e) => log.appendEntry(e));

		// Ensure the file exists, then open it in a new leaf. Creating it up front
		// means the open action always lands on a real file even before any tool
		// has recorded an entry.
		const openLog = async (): Promise<void> => {
			const path = log.path;
			let file = ctx.app.vault.getFileByPath(path);
			if (!(file instanceof TFile)) {
				await log.clear();
				file = ctx.app.vault.getFileByPath(path);
			}
			if (file instanceof TFile) {
				await ctx.app.workspace.getLeaf(true).openFile(file);
			}
		};

		// A session-start entry stamps each load with the captured environment, so
		// the ledger always opens with a version block for the current run.
		if (ctx.settings.logSessionStart) {
			ctx.lib.diagnostics.append("session-start", {
				status: "info",
				body: ctx.lib.context.capture() as unknown as Record<string, unknown>,
			});
		}

		ctx.plugin.addCommand({
			id: "copy-diagnostics-log",
			name: "Copy diagnostics log",
			callback: () => {
				void log.read().then(async (text) => {
					await ctx.lib.clipboard.writeText(text);
					new Notice("Diagnostics log copied.");
				});
			},
		});

		ctx.plugin.addCommand({
			id: "clear-diagnostics-log",
			name: "Clear diagnostics log",
			callback: () => {
				void log.clear().then(() => {
					new Notice("Diagnostics log cleared.");
				});
			},
		});

		ctx.plugin.addCommand({
			id: "open-diagnostics-log",
			name: "Open diagnostics log",
			callback: () => void openLog(),
		});

		const ribbon = ctx.plugin.addRibbonIcon("scroll-text", "Open diagnostics log", () =>
			void openLog(),
		);

		return {
			dispose: (): void => {
				detach();
				ribbon.detach();
			},
		};
	},

	renderSettings(container: HTMLElement, ctx: Ctx): void {
		renderDiagnosticsSettings(container, ctx);
	},
};

export default diagnostics;
