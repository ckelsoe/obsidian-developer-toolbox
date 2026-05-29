import { App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, TextAreaComponent, setIcon } from "obsidian";
import type { ToolboxLib, CapturedContext } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { AnnotationStage } from "./annotation/stage";
import type { SerializedAnnotations, ToolMode } from "./annotation/types";
import { PALETTE, STROKE_WIDTHS } from "./annotation/types";
import type { CapturedImage } from "./capture";
import { buildPayload, buildIssueDocument } from "./payload";
import { saveSettings } from "../../settings";
import { ISSUE_TYPES, type AnnotationDraft, type IssueCaptureSettings, type IssueType } from "./types";

interface IssueDialogOpts {
	capturedImage: CapturedImage | null;
	prefilledContext: CapturedContext;
	settings: IssueCaptureSettings;
	lib: ToolboxLib;
	// D3: when resuming a draft, the editable annotation model to restore on top
	// of the draft's screenshot.
	restore?: SerializedAnnotations | null;
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
	private annotationStage: AnnotationStage | null = null;
	private restoreState: SerializedAnnotations | null;
	private deleteBtn: HTMLButtonElement | null = null;
	// Original (unflattened) screenshot as a data URL, captured once the image
	// loads. Persisted in a draft so reopening restores editable objects, not a
	// baked PNG.
	private sourceImageDataUrl: string | null = null;
	// Set once the payload is copied so the draft is cleared rather than re-saved
	// on close.
	private copied = false;

	constructor(app: App, plugin: DeveloperToolboxPlugin, opts: IssueDialogOpts) {
		super(app);
		this.toolboxPlugin = plugin;
		this.capturedImage = opts.capturedImage;
		this.context = opts.prefilledContext;
		this.settings = opts.settings;
		this.lib = opts.lib;
		this.restoreState = opts.restore ?? null;
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
		// Snapshot the draft before tearing the stage down (serialize needs it).
		const draft = this.copied ? null : this.captureDraftSnapshot();
		this.annotationStage?.destroy();
		this.annotationStage = null;
		this.contentEl.empty();
		void this.persistDraft(draft);
	}

	// D3: a sync snapshot of the editable state, or null when there is nothing
	// worth keeping (drafts off, no annotations, or the source not yet encoded).
	private captureDraftSnapshot(): AnnotationDraft | null {
		if (!this.settings.saveAnnotationDraft) return null;
		const stage = this.annotationStage;
		if (!stage || stage.isEmpty()) return null;
		if (!this.sourceImageDataUrl || !this.capturedImage) return null;
		return {
			imageDataUrl: this.sourceImageDataUrl,
			capturedAt: this.capturedImage.capturedAt,
			serialized: stage.serialize(),
		};
	}

	private async persistDraft(draft: AnnotationDraft | null): Promise<void> {
		const current = this.settings.annotationDraft ?? null;
		if (current === null && draft === null) return;
		this.settings.annotationDraft = draft;
		await saveSettings(this.toolboxPlugin);
	}

	private async captureSourceDataUrl(): Promise<void> {
		if (!this.capturedImage) return;
		this.sourceImageDataUrl = await blobToDataUrl(this.capturedImage.pngBlob);
	}

	private renderScreenshotPreview(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, {
			name: "Screenshot",
			description: "Draw on the image. Use blackout to redact PII before copying.",
		});

		const toolbar = content.createDiv({ cls: "toolbox-annotation-toolbar" });
		const canvasHolder = content.createDiv({ cls: "toolbox-annotation-stage" });

		const img = activeDocument.createElement("img");
		const url = URL.createObjectURL(this.capturedImage!.pngBlob);
		img.onload = (): void => {
			URL.revokeObjectURL(url);
			this.annotationStage = new AnnotationStage(canvasHolder, img, this.restoreState ?? undefined);
			this.annotationStage.onSelectionChange(() => this.refreshDeleteButton());
			this.renderAnnotationToolbar(toolbar);
			// Snapshot the unflattened source for draft persistence (D3).
			void this.captureSourceDataUrl();
		};
		img.src = url;
	}

	private renderAnnotationToolbar(parent: HTMLElement): void {
		parent.empty();

		const tools: { id: ToolMode; icon: string; label: string }[] = [
			{ id: "select", icon: "mouse-pointer-2", label: "Select (move, resize, rotate)" },
			{ id: "pen", icon: "pencil", label: "Pen" },
			{ id: "box", icon: "square", label: "Box" },
			{ id: "arrow", icon: "arrow-up-right", label: "Arrow" },
			{ id: "highlight", icon: "highlighter", label: "Highlight" },
			{ id: "text", icon: "type", label: "Text" },
			{ id: "blackout", icon: "eye-off", label: "Blackout (PII)" },
		];

		for (const tool of tools) {
			const btn = parent.createEl("button", { cls: "toolbox-annotation-tool", attr: { "aria-label": tool.label, type: "button", "data-tool": tool.id } });
			setIcon(btn, tool.icon);
			btn.addEventListener("click", () => {
				this.annotationStage?.setTool(tool.id);
				this.refreshToolbarActive(parent);
			});
		}

		const widthGroup = parent.createDiv({ cls: "toolbox-annotation-widths" });
		for (const width of STROKE_WIDTHS) {
			const btn = widthGroup.createEl("button", {
				cls: "toolbox-annotation-width",
				attr: { "aria-label": `${width.label} stroke`, type: "button", "data-width": width.id, title: `${width.label} (${width.px}px)` },
			});
			btn.createSpan({ cls: `toolbox-annotation-width-bar toolbox-annotation-width-bar-${width.id}` });
			btn.addEventListener("click", () => {
				this.annotationStage?.setStrokeWidth(width.px);
				this.refreshToolbarActive(parent);
			});
		}

		const colorGroup = parent.createDiv({ cls: "toolbox-annotation-colors" });
		for (const color of PALETTE) {
			const swatch = colorGroup.createEl("button", {
				cls: "toolbox-annotation-color",
				attr: { "aria-label": `Color ${color}`, type: "button", "data-color": color },
			});
			swatch.addEventListener("click", () => {
				this.annotationStage?.setPaletteColor(color);
				this.refreshToolbarActive(parent);
			});
		}

		const actions = parent.createDiv({ cls: "toolbox-annotation-actions" });

		const lockBtn = actions.createEl("button", { cls: "toolbox-annotation-action", attr: { "aria-label": "Unlock blackouts to move them", type: "button" } });
		const paintLock = (): void => {
			const unlocked = this.annotationStage?.isBlackoutsUnlocked() ?? false;
			lockBtn.empty();
			setIcon(lockBtn, unlocked ? "lock-open" : "lock");
			lockBtn.toggleClass("is-active", unlocked);
			lockBtn.setAttribute("aria-label", unlocked ? "Lock blackouts" : "Unlock blackouts to move them");
		};
		paintLock();
		lockBtn.addEventListener("click", () => {
			const stage = this.annotationStage;
			if (!stage) return;
			stage.setBlackoutsUnlocked(!stage.isBlackoutsUnlocked());
			paintLock();
			this.refreshToolbarActive(parent);
		});

		const deleteBtn = actions.createEl("button", { cls: "toolbox-annotation-action", attr: { "aria-label": "Delete selection", type: "button" } });
		setIcon(deleteBtn, "eraser");
		deleteBtn.addEventListener("click", () => {
			this.annotationStage?.deleteSelected();
			this.refreshToolbarActive(parent);
		});
		this.deleteBtn = deleteBtn;
		this.refreshDeleteButton();

		const undoBtn = actions.createEl("button", { cls: "toolbox-annotation-action", attr: { "aria-label": "Undo", type: "button" } });
		setIcon(undoBtn, "undo-2");
		undoBtn.addEventListener("click", () => {
			this.annotationStage?.undo();
			this.refreshToolbarActive(parent);
		});

		const redoBtn = actions.createEl("button", { cls: "toolbox-annotation-action", attr: { "aria-label": "Redo", type: "button" } });
		setIcon(redoBtn, "redo-2");
		redoBtn.addEventListener("click", () => {
			this.annotationStage?.redo();
			this.refreshToolbarActive(parent);
		});

		const clearBtn = actions.createEl("button", { cls: "toolbox-annotation-action", attr: { "aria-label": "Clear all", type: "button" } });
		setIcon(clearBtn, "trash-2");
		clearBtn.addEventListener("click", () => {
			this.annotationStage?.clearAll();
			this.refreshToolbarActive(parent);
		});

		this.refreshToolbarActive(parent);
	}

	private refreshToolbarActive(toolbar: HTMLElement): void {
		const stage = this.annotationStage;
		if (!stage) return;
		const activeTool = stage.getCurrentTool();
		const activeColor = stage.getPalette().color;
		const activeWidth = stage.getPalette().strokeWidth;
		const activeWidthId = STROKE_WIDTHS.find((w) => w.px === activeWidth)?.id ?? null;
		toolbar.querySelectorAll<HTMLElement>(".toolbox-annotation-tool").forEach((btn) => {
			btn.toggleClass("is-active", btn.dataset.tool === activeTool);
		});
		toolbar.querySelectorAll<HTMLElement>(".toolbox-annotation-color").forEach((btn) => {
			btn.toggleClass("is-active", btn.dataset.color === activeColor);
		});
		toolbar.querySelectorAll<HTMLElement>(".toolbox-annotation-width").forEach((btn) => {
			btn.toggleClass("is-active", btn.dataset.width === activeWidthId);
		});
		this.refreshDeleteButton();
	}

	private refreshDeleteButton(): void {
		if (!this.deleteBtn) return;
		const enabled = this.annotationStage?.hasSelection() ?? false;
		this.deleteBtn.toggleClass("is-disabled", !enabled);
		this.deleteBtn.disabled = !enabled;
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
			const mode = this.context.activeViewMode === "unknown" ? "" : ` (${this.context.activeViewMode})`;
			list.createDiv({ text: `Active file: ${this.context.activeFile}${mode}` });
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
		const folder = this.lib.storage.resolve(this.settings.screenshotSubfolder);
		await this.lib.vaultPaths.ensureFolder(folder);
		const stamp = formatTimestamp(this.capturedImage.capturedAt);
		const targetRel = `${folder}/${stamp}.png`;
		const unique = await this.lib.vaultPaths.suggestUnique(targetRel);
		const blob = await this.flattenedBlob();
		const buf = await blob.arrayBuffer();
		await this.app.vault.createBinary(unique, buf);
		this.savedImagePath = unique;
		return unique;
	}

	private async flattenedBlob(): Promise<Blob> {
		if (this.annotationStage && !this.annotationStage.isEmpty()) {
			return await this.annotationStage.toBlob();
		}
		return this.capturedImage!.pngBlob;
	}

	private async handleCopy(): Promise<void> {
		try {
			const savedPath = await this.ensureScreenshotSaved();
			if (savedPath && !this.payloadEdited) {
				this.payloadTextarea?.setValue(this.generatePayloadText(savedPath));
			}
			const text = this.payloadTextarea?.getValue() ?? "";
			await this.lib.clipboard.writeText(text);

			let savedIssuePath: string | null = null;
			if (this.settings.saveIssueFile) {
				savedIssuePath = await this.saveIssueFile(savedPath);
			}

			new Notice(
				savedIssuePath
					? `Copied payload. Saved issue to ${savedIssuePath}`
					: "Copied issue payload to clipboard.",
				2500,
			);
			this.copied = true;
			this.close();
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}

	private async saveIssueFile(screenshotPath: string | null): Promise<string> {
		const folder = this.lib.storage.resolve(this.settings.issueSubfolder);
		await this.lib.vaultPaths.ensureFolder(folder);
		const when = this.capturedImage?.capturedAt ?? Date.now();
		const stamp = formatTimestamp(when);
		const targetRel = `${folder}/${stamp}-${this.issueType}.md`;
		const unique = await this.lib.vaultPaths.suggestUnique(targetRel);
		const doc = buildIssueDocument({
			screenshotPath,
			type: this.issueType,
			description: this.description,
			context: this.context,
			capturedAt: when,
		});
		await this.app.vault.create(unique, doc);
		return unique;
	}

	private async handleCopyPathOnly(): Promise<void> {
		try {
			const savedPath = await this.ensureScreenshotSaved();
			if (!savedPath) return;
			await this.lib.clipboard.writeText(savedPath);
			new Notice(`Copied path: ${savedPath}`, 2000);
			this.copied = true;
			this.close();
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(reader.error ?? new Error("Failed to read image."));
		reader.readAsDataURL(blob);
	});
}

function formatTimestamp(epoch: number): string {
	const d = new Date(epoch);
	const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
