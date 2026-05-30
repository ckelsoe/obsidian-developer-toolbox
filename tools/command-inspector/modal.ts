import { App, ButtonComponent, Modal, Notice, SearchComponent } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { createVirtualList, type VirtualListController } from "../../lib/ui/virtual-list";
import { buildCommandRows, filterCommands, formatBlob, type CommandRow } from "./collect";

interface CommandInspectorOpts {
	lib: ToolboxLib;
}

// Fixed row height for the virtual list. Every column is single-line and
// ellipsizes, so the height is uniform and the full set scrolls without a cap.
const ROW_HEIGHT = 30;

// Dump every registered command with its full id, owning plugin, and effective
// hotkeys. The command registry (app.commands) and hotkey manager
// (app.hotkeyManager) are undocumented internals: read them defensively (the
// augmented types are all optional) and degrade to an empty table rather than
// throwing if a future Obsidian build changes their shape. The list is
// virtualized, so every matching command is reachable by scrolling.
export class CommandInspectorModal extends Modal {
	private lib: ToolboxLib;
	private rows: CommandRow[];
	private countEl!: HTMLElement;
	private matches: CommandRow[] = [];
	private vlist: VirtualListController | null = null;

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
		this.modalEl.addClass("toolbox-inspector-dialog");
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

		const search = new SearchComponent(contentEl);
		search.setPlaceholder("Search by ID, plugin, or hotkey");
		search.inputEl.addClass("toolbox-cmd-search");
		search.onChange((value) => this.renderList(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-cmd-count" });
		const listEl = contentEl.createDiv({ cls: "toolbox-cmd-list" });

		this.vlist = createVirtualList({
			scrollEl: listEl,
			rowHeight: ROW_HEIGHT,
			renderRow: (index, rowEl) => this.renderRow(index, rowEl),
		});

		this.renderButtons(contentEl);
		this.renderList("");
	}

	onClose(): void {
		this.vlist?.destroy();
		this.vlist = null;
		this.contentEl.empty();
	}

	private renderList(query: string): void {
		this.matches = filterCommands(this.rows, query);
		this.countEl.setText(`${this.matches.length} commands`);
		this.vlist?.setRowCount(this.matches.length);
	}

	private renderRow(index: number, rowEl: HTMLElement): void {
		const r = this.matches[index];
		if (!r) return;
		rowEl.addClass("toolbox-cmd-row");
		rowEl.setAttribute("aria-label", `Copy ${r.id}`);
		rowEl.setAttribute("title", r.id);
		rowEl.createSpan({ cls: "toolbox-cmd-id", text: r.id });
		rowEl.createSpan({ cls: "toolbox-cmd-plugin", text: r.owningPlugin });
		rowEl.createSpan({
			cls: "toolbox-cmd-hotkey",
			text: r.hotkeys.length ? r.hotkeys.join(", ") : "no hotkey",
		});
		rowEl.addEventListener("click", () => void this.copyId(r));
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
