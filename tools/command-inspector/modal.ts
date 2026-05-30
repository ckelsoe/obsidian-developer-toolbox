import { App, ButtonComponent, Modal, Notice, TextComponent } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { buildCommandRows, filterCommands, formatBlob, type CommandRow } from "./collect";

interface CommandInspectorOpts {
	lib: ToolboxLib;
}

const DISPLAY_CAP = 400;

// Dump every registered command with its full id, owning plugin, and effective
// hotkeys. The command registry (app.commands) and hotkey manager
// (app.hotkeyManager) are undocumented internals: read them defensively (the
// augmented types are all optional) and degrade to an empty/partial table rather
// than throwing if a future Obsidian build changes their shape.
export class CommandInspectorModal extends Modal {
	private lib: ToolboxLib;
	private rows: CommandRow[];
	private list!: HTMLElement;
	private countEl!: HTMLElement;
	private matches: CommandRow[] = [];

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: CommandInspectorOpts) {
		super(app);
		this.lib = opts.lib;

		const commands = app.commands?.commands ?? {};
		const manifests = app.plugins?.manifests ?? {};
		const customKeys = app.hotkeyManager?.customKeys ?? {};
		const defaultKeys = app.hotkeyManager?.defaultKeys ?? {};
		this.rows = buildCommandRows(commands, manifests, customKeys, defaultKeys);
	}

	onOpen(): void {
		this.titleEl.setText("Command inspector");

		const { contentEl } = this;
		contentEl.empty();

		if (this.rows.length === 0) {
			contentEl.createDiv({
				cls: "toolbox-cmd-count",
				text: "No commands found. The command registry is an undocumented Obsidian internal and may have changed shape in this build.",
			});
			this.renderButtons(contentEl);
			return;
		}

		const search = new TextComponent(contentEl);
		search.setPlaceholder("Search by ID, plugin, or hotkey");
		search.inputEl.addClass("toolbox-cmd-search");
		search.onChange((value) => this.renderList(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-cmd-count" });
		this.list = contentEl.createDiv({ cls: "toolbox-cmd-list" });

		this.renderButtons(contentEl);
		this.renderList("");
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderList(query: string): void {
		this.matches = filterCommands(this.rows, query);
		const shown = this.matches.slice(0, DISPLAY_CAP);

		this.countEl.setText(
			shown.length < this.matches.length
				? `Showing first ${shown.length} of ${this.matches.length} matches. Refine the search to narrow.`
				: `${this.matches.length} commands`,
		);

		this.list.empty();
		const fragment = activeDocument.createDocumentFragment();
		for (const r of shown) {
			const row = fragment.createDiv({
				cls: "toolbox-cmd-row",
				attr: { "aria-label": `Copy ${r.id}`, title: r.id },
			});
			row.createSpan({ cls: "toolbox-cmd-id", text: r.id });
			row.createSpan({ cls: "toolbox-cmd-plugin", text: r.owningPlugin });
			row.createSpan({
				cls: "toolbox-cmd-hotkey",
				text: r.hotkeys.length ? r.hotkeys.join(", ") : "no hotkey",
			});
			row.addEventListener("click", () => void this.copyId(r));
		}
		this.list.appendChild(fragment);
	}

	private renderButtons(parent: HTMLElement): void {
		const row = parent.createDiv({ cls: "toolbox-issue-buttons" });

		new ButtonComponent(row)
			.setButtonText("Close")
			.onClick(() => this.close());

		if (this.rows.length > 0) {
			new ButtonComponent(row)
				.setButtonText("Copy all")
				.setCta()
				.onClick(() => void this.copyAll());
		}
	}

	private async copyId(r: CommandRow): Promise<void> {
		try {
			await this.lib.clipboard.writeText(r.id);
			new Notice(`Copied ${r.id}.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}

	private async copyAll(): Promise<void> {
		try {
			await this.lib.clipboard.writeText(formatBlob(this.matches));
			new Notice(`Copied ${this.matches.length} commands.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}
