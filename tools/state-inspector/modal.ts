import { App, ButtonComponent, Modal, Notice, Setting, TextAreaComponent } from "obsidian";
import type { CapturedContext, ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { FIELD_ROWS, formatBlob, formatFieldValue, formatRowSummary } from "./format";
import type { StateInspectorSettings } from "./types";

interface StateInspectorOpts {
	settings: StateInspectorSettings;
	lib: ToolboxLib;
}

// A read-once browse-and-copy snapshot of the live environment. Modal, not an
// ItemView: it matches both existing tools, fits the read-once nature better
// than a persistent dock, and keeps the full-width blob out of a narrow rail.
export class StateInspectorModal extends Modal {
	private settings: StateInspectorSettings;
	private lib: ToolboxLib;
	private context: CapturedContext;

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: StateInspectorOpts) {
		super(app);
		this.settings = opts.settings;
		this.lib = opts.lib;
		this.context = this.lib.context.capture({
			includeVaultName: this.settings.includeVaultName,
			includePluginList: this.settings.includePluginList,
			pathStyle: this.settings.pathStyle,
		});
	}

	onOpen(): void {
		this.titleEl.setText("Live state inspector");

		const { contentEl } = this;
		contentEl.empty();

		for (const row of FIELD_ROWS) {
			new Setting(contentEl)
				.setName(row.label)
				.setDesc(formatRowSummary(this.context, row.key))
				.addExtraButton((btn) => {
					btn
						.setIcon("copy")
						.setTooltip(`Copy ${row.label.toLowerCase()}`)
						.onClick(() => void this.copyField(row.key, row.label));
				});
		}

		this.renderBlob(contentEl);
		this.renderButtons(contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderBlob(parent: HTMLElement): void {
		const { content } = this.lib.ui.stackedRow(parent, {
			name: "Full snapshot",
			description: "Every field as one block. Edit before copying if you need to.",
		});
		const textarea = new TextAreaComponent(content).setValue(formatBlob(this.context));
		textarea.inputEl.addClass("toolbox-state-inspector-blob");
	}

	private renderButtons(parent: HTMLElement): void {
		const row = parent.createDiv({ cls: "toolbox-issue-buttons" });

		new ButtonComponent(row)
			.setButtonText("Close")
			.onClick(() => this.close());

		new ButtonComponent(row)
			.setButtonText("Copy all")
			.setCta()
			.onClick(() => void this.copyAll());
	}

	private async copyField(key: keyof CapturedContext, label: string): Promise<void> {
		try {
			await this.lib.clipboard.writeText(formatFieldValue(this.context, key));
			new Notice(`Copied ${label.toLowerCase()}.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}

	private async copyAll(): Promise<void> {
		try {
			await this.lib.clipboard.writeText(formatBlob(this.context));
			new Notice("Copied live state snapshot.", 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}
