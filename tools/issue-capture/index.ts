import { Notice } from "obsidian";
import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_ISSUE_CAPTURE_SETTINGS, type IssueCaptureSettings } from "./types";
import { capture } from "./capture";
import { IssueDialog } from "./modal";
import { renderIssueCaptureSettings } from "./settings";

type Ctx = ToolContext<IssueCaptureSettings>;

interface StartCaptureOpts {
	withScreenshot: boolean;
	delayMs?: number;
}

class IssueCaptureHandlers {
	constructor(private ctx: Ctx) {}

	async startCapture(opts: StartCaptureOpts): Promise<void> {
		try {
			const settings = this.ctx.settings;
			let capturedImage = null;
			if (opts.withScreenshot) {
				capturedImage = await capture(
					{ delayMs: opts.delayMs },
					this.ctx.lib,
				);
			}
			const context = this.ctx.lib.context.capture({
				includeVaultName: settings.includeVaultName,
				includePluginList: settings.includePluginList,
				pathStyle: settings.pathStyle,
			});
			const dialog = new IssueDialog(this.ctx.app, this.ctx.plugin, {
				capturedImage,
				prefilledContext: context,
				settings,
				lib: this.ctx.lib,
			});
			dialog.open();
		} catch (e) {
			new Notice("Screenshot failed: " + (e as Error).message, 8000);
		}
	}
}

const issueCapture: ToolHandle<IssueCaptureSettings> = {
	id: "issue-capture",
	displayName: "Issue capture",
	defaultSettings: DEFAULT_ISSUE_CAPTURE_SETTINGS,

	register(ctx: Ctx): Disposable {
		const handlers = new IssueCaptureHandlers(ctx);

		const ribbonScreenshot = ctx.plugin.addRibbonIcon(
			"camera",
			"Screenshot now",
			() => void handlers.startCapture({
				withScreenshot: true,
				delayMs: ctx.settings.immediateSettleMs,
			}),
		);
		const ribbonDelayed = ctx.plugin.addRibbonIcon(
			"timer",
			"Delayed screenshot",
			() => void handlers.startCapture({
				withScreenshot: true,
				delayMs: ctx.settings.delayedCaptureSeconds * 1000,
			}),
		);
		const ribbonIssue = ctx.plugin.addRibbonIcon(
			"message-square-plus",
			"Open issue dialog",
			() => void handlers.startCapture({ withScreenshot: false }),
		);

		ctx.plugin.addCommand({
			id: "screenshot-now",
			name: "Screenshot now",
			callback: () => void handlers.startCapture({
				withScreenshot: true,
				delayMs: ctx.settings.immediateSettleMs,
			}),
		});
		ctx.plugin.addCommand({
			id: "delayed-screenshot",
			name: "Delayed screenshot",
			callback: () => void handlers.startCapture({
				withScreenshot: true,
				delayMs: ctx.settings.delayedCaptureSeconds * 1000,
			}),
		});
		ctx.plugin.addCommand({
			id: "text-only-issue",
			name: "Text-only issue",
			callback: () => void handlers.startCapture({ withScreenshot: false }),
		});

		return {
			dispose: (): void => {
				ribbonScreenshot.detach();
				ribbonDelayed.detach();
				ribbonIssue.detach();
			},
		};
	},

	renderSettings(container: HTMLElement, ctx: Ctx): void {
		renderIssueCaptureSettings(container, ctx);
	},
};

export default issueCapture;
