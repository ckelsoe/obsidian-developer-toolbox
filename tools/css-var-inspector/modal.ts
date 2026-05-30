import { App, ButtonComponent, Modal, Notice, SearchComponent } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { createVirtualList, type VirtualListController } from "../../lib/ui/virtual-list";
import { collectCssVars } from "./collect";
import { filterCssVars, formatBlob, formatVarLine } from "./format";
import type { CssVar } from "./types";

interface CssVarInspectorOpts {
	lib: ToolboxLib;
}

// Fixed row height for the virtual list. Rows are single-line (name and value
// both ellipsize), so a uniform height holds and the full set scrolls without a
// cap.
const ROW_HEIGHT = 30;

// A searchable, copyable dump of every CSS custom property the active theme and
// Obsidian define, with current computed values. Standard CSSOM, no Obsidian API.
// The list is virtualized, so every matching variable is reachable by scrolling
// rather than capped.
export class CssVarInspectorModal extends Modal {
	private lib: ToolboxLib;
	private allVars: CssVar[];
	private countEl!: HTMLElement;
	private matches: CssVar[] = [];
	private vlist: VirtualListController | null = null;

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: CssVarInspectorOpts) {
		super(app);
		this.lib = opts.lib;
		// Collect once on open (the scan is O(rules); do not repeat per keystroke).
		this.allVars = collectCssVars(activeDocument);
	}

	onOpen(): void {
		this.modalEl.addClass("toolbox-inspector-dialog");
		this.titleEl.setText("CSS variable inspector");

		const { contentEl } = this;
		contentEl.empty();

		const search = new SearchComponent(contentEl);
		search.setPlaceholder("Search variables by name or value");
		search.inputEl.addClass("toolbox-cssvar-search");
		search.onChange((value) => this.renderList(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-cssvar-count" });
		const listEl = contentEl.createDiv({ cls: "toolbox-cssvar-list" });

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
		this.matches = filterCssVars(this.allVars, query);
		this.countEl.setText(`${this.matches.length} variables`);
		this.vlist?.setRowCount(this.matches.length);
	}

	private renderRow(index: number, rowEl: HTMLElement): void {
		const v = this.matches[index];
		if (!v) return;
		rowEl.addClass("toolbox-cssvar-row");
		rowEl.setAttribute("aria-label", `Copy ${v.name}`);
		rowEl.setAttribute("title", formatVarLine(v));
		rowEl.createSpan({ cls: "toolbox-cssvar-name", text: v.name });
		rowEl.createSpan({
			cls: "toolbox-cssvar-value",
			text: v.value || "(unset in current theme)",
		});
		rowEl.addEventListener("click", () => void this.copyLine(v));
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

	private async copyLine(v: CssVar): Promise<void> {
		try {
			await this.lib.clipboard.writeText(formatVarLine(v));
			new Notice(`Copied ${v.name}.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}

	private async copyAll(): Promise<void> {
		try {
			await this.lib.clipboard.writeText(formatBlob(this.matches));
			new Notice(`Copied ${this.matches.length} variables.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}
