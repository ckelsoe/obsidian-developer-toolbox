import { App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, TextAreaComponent, normalizePath } from "obsidian";
import type { ToolboxLib, CapturedContext } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import type { CapturedImage } from "./capture";
import { buildPayload } from "./payload";
import { ISSUE_TYPES, type IssueCaptureSettings, type IssueType } from "./types";

interface IssueDialogOpts {
	capturedImage: CapturedImage | null;
	prefilledContext: CapturedContext;
	settings: IssueCaptureSettings;
	lib: ToolboxLib;
}

export class IssueDialog extends Modal {
	private capturedImage: CapturedImage | null;
	private context: CapturedContext;
	private settings: IssueCaptureSettings;
	private lib: ToolboxLib;
	private toolboxPlugin: DeveloperToolboxPlugin;

	private issueType: IssueType;
	private description = "";
	private payloadEdited = false;
	private payloadTextarea: TextAreaComponent | null = null;
	private savedImagePath: string | null = null;

	constructor(app: App, plugin: DeveloperToolboxPlugin, opts: IssueDialogOpts) {
		super(app);
		this.toolboxPlugin = plugin;
		this.capturedImage = opts.capturedImage;
		this.context = opts.prefilledContext;
		this.settings = opts.settings;
		this.lib = opts.lib;
		this.issueType = opts.settings.defaultIssueType;
	}

	onOpen(): void {
		this.modalEl.addClass("toolbox-issue-dialog");
		this.titleEl.setText("Issue capture");

		const { contentEl } = this;
		contentEl.empty();

		if (this.capturedImage) {
			this.renderScreenshotPreview(contentEl);
		}

		this.renderTypeRow(contentEl);
		this.renderDescriptionRow(contentEl);
		this.renderContextSummary(contentEl);
		this.renderPayloadPreview(contentEl);
		this.renderButtons(contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderScreenshotPreview(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, { name: "Screenshot" });
		const img = content.createEl("img", { cls: "toolbox-issue-screenshot" });
		const url = URL.createObjectURL(this.capturedImage!.pngBlob);
		img.src = url;
		this.toolboxPlugin.register(() => URL.revokeObjectURL(url));
	}

	private renderTypeRow(parent: HTMLElement): void {
		new Setting(parent)
			.setName("Type")
			.addDropdown((dropdown: DropdownComponent) => {
				for (const t of ISSUE_TYPES) {
					dropdown.addOption(t.id, t.label);
				}
				dropdown.setValue(this.issueType);
				dropdown.onChange((value) => {
					this.issueType = value as IssueType;
					this.regeneratePayload();
				});
			});
	}

	private renderDescriptionRow(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, {
			name: "Description",
			description: "Plain prose. Markdown is fine; whatever you paste later interprets it.",
		});
		new TextAreaComponent(content)
			.setPlaceholder("Describe the issue, repro, or question.")
			.onChange((value) => {
				this.description = value;
				this.regeneratePayload();
			}).inputEl.addClass("toolbox-issue-description-textarea");
	}

	private renderContextSummary(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, { name: "Captured context" });
		const list = content.createDiv({ cls: "toolbox-issue-context-list" });
		list.createDiv({ text: `Obsidian ${this.context.obsidianVersion} / ${this.context.osFamily}${this.context.vaultName ? " / vault: " + this.context.vaultName : ""}` });
		if (this.context.activeFile) {
			list.createDiv({ text: `Active file: ${this.context.activeFile} (${this.context.activeViewMode})` });
		}
		if (this.context.enabledPluginIds) {
			list.createDiv({ text: `Plugins enabled: ${this.context.enabledPluginIds.length}` });
		}
	}

	private renderPayloadPreview(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, {
			name: "Payload preview",
			description: "These are the exact bytes that get copied. Edit freely.",
		});
		this.payloadTextarea = new TextAreaComponent(content)
			.setValue(this.generatePayloadText(null))
			.onChange(() => {
				this.payloadEdited = true;
			});
		this.payloadTextarea.inputEl.addClass("toolbox-issue-payload-textarea");
	}

	private renderButtons(parent: HTMLElement): void {
		const row = parent.createDiv({ cls: "toolbox-issue-buttons" });

		if (this.capturedImage) {
			new ButtonComponent(row)
				.setButtonText("Copy path only")
				.onClick(() => void this.handleCopyPathOnly());
		}

		new ButtonComponent(row)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		new ButtonComponent(row)
			.setButtonText("Copy")
			.setCta()
			.onClick(() => void this.handleCopy());
	}

	private generatePayloadText(screenshotPath: string | null): string {
		return buildPayload({
			screenshotPath,
			type: this.issueType,
			description: this.description,
			context: this.context,
		});
	}

	private regeneratePayload(): void {
		if (!this.payloadTextarea) return;
		if (this.payloadEdited) return;
		const text = this.generatePayloadText(this.savedImagePath);
		this.payloadTextarea.setValue(text);
	}

	private async ensureScreenshotSaved(): Promise<string | null> {
		if (!this.capturedImage) return null;
		if (this.savedImagePath) return this.savedImagePath;
		const folder = normalizePath(this.settings.screenshotFolder);
		await this.lib.vaultPaths.ensureFolder(folder);
		const stamp = formatTimestamp(this.capturedImage.capturedAt);
		const targetRel = `${folder}/${stamp}.png`;
		const unique = await this.lib.vaultPaths.suggestUnique(targetRel);
		const buf = await this.capturedImage.pngBlob.arrayBuffer();
		await this.app.vault.createBinary(unique, buf);
		this.savedImagePath = unique;
		return unique;
	}

	private async handleCopy(): Promise<void> {
		try {
			const savedPath = await this.ensureScreenshotSaved();
			if (savedPath && !this.payloadEdited) {
				this.payloadTextarea?.setValue(this.generatePayloadText(savedPath));
			}
			const text = this.payloadTextarea?.getValue() ?? "";
			await this.lib.clipboard.writeText(text);
			new Notice("Copied issue payload to clipboard.", 2000);
			this.close();
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}

	private async handleCopyPathOnly(): Promise<void> {
		try {
			const savedPath = await this.ensureScreenshotSaved();
			if (!savedPath) return;
			await this.lib.clipboard.writeText(savedPath);
			new Notice(`Copied path: ${savedPath}`, 2000);
			this.close();
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}

function formatTimestamp(epoch: number): string {
	const d = new Date(epoch);
	const pad = (n: number): string => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
