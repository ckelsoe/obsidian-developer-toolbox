import { App, Modal, Notice, SearchComponent, getIconIds, setIcon } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { createVirtualList, type VirtualListController } from "../../lib/ui/virtual-list";
import { filterIcons, sortIcons } from "./collect";

interface IconBrowserOpts {
	lib: ToolboxLib;
}

// Fixed grid-row height for the virtual list (preview glyph plus a two-line
// clamped id label). Each virtual row holds `columns` cells.
const ROW_HEIGHT = 88;

// Approximate cell footprint (min cell width plus gap). Columns is derived from
// the container width divided by this, so the grid reflows as the modal resizes.
const CELL_FOOTPRINT = 100;

// Browse and copy Lucide / Obsidian icon ids usable in setIcon and addRibbonIcon.
// getIconIds() and setIcon() are public module exports (obsidian.d.ts:3233, :5517).
// The grid is virtualized as rows of `columns` cells, so the full ~1500-icon set
// scrolls smoothly without a render cap.
export class IconBrowserModal extends Modal {
	private lib: ToolboxLib;
	private allIds: string[];
	private listEl!: HTMLElement;
	private countEl!: HTMLElement;
	private matches: string[] = [];
	private columns = 6;
	private vlist: VirtualListController | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: IconBrowserOpts) {
		super(app);
		this.lib = opts.lib;
		// Enumerate live and sort once. Never hardcode: the set is runtime
		// dependent (core icons plus any addIcon registrations from other plugins).
		this.allIds = sortIcons(getIconIds());
	}

	onOpen(): void {
		this.modalEl.addClass("toolbox-inspector-dialog");
		this.titleEl.setText("Icon browser");

		const { contentEl } = this;
		contentEl.empty();

		const search = new SearchComponent(contentEl);
		search.setPlaceholder("Search icons by ID");
		search.inputEl.addClass("toolbox-icon-search");
		search.onChange((value) => this.renderList(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-icon-count" });
		this.listEl = contentEl.createDiv({ cls: "toolbox-icon-grid" });

		this.vlist = createVirtualList({
			scrollEl: this.listEl,
			rowHeight: ROW_HEIGHT,
			renderRow: (index, rowEl) => this.renderRow(index, rowEl),
		});

		// Recompute columns and row count whenever the grid's width changes (modal
		// resize, window resize). Observing also fires once with the initial size,
		// which corrects the column count after first layout.
		this.resizeObserver = new ResizeObserver(() => this.relayout());
		this.resizeObserver.observe(this.listEl);

		this.renderList("");
	}

	onClose(): void {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.vlist?.destroy();
		this.vlist = null;
		this.contentEl.empty();
	}

	private renderList(query: string): void {
		this.matches = filterIcons(this.allIds, query);
		this.countEl.setText(`${this.matches.length} icons`);
		this.relayout();
	}

	// Map the current match count onto grid rows for the active column count.
	private relayout(): void {
		this.columns = this.computeColumns();
		const rowCount = Math.ceil(this.matches.length / this.columns);
		this.vlist?.setRowCount(rowCount);
	}

	private computeColumns(): number {
		const width = this.listEl?.clientWidth ?? 0;
		// Before first layout the width is 0; keep the last known column count so
		// the grid is not briefly single-column. The ResizeObserver corrects it.
		if (width <= 0) return this.columns;
		return Math.max(1, Math.floor(width / CELL_FOOTPRINT));
	}

	private renderRow(rowIndex: number, rowEl: HTMLElement): void {
		rowEl.addClass("toolbox-icon-row");
		const start = rowIndex * this.columns;
		for (let c = 0; c < this.columns; c++) {
			const idx = start + c;
			if (idx >= this.matches.length) {
				// Pad the trailing slots so the real cells keep their width.
				rowEl.createDiv({ cls: "toolbox-icon-cell-spacer" });
				continue;
			}
			const id = this.matches[idx];
			if (id === undefined) continue;
			const cell = rowEl.createDiv({
				cls: "toolbox-icon-cell",
				attr: { "aria-label": `Copy ${id}`, title: id },
			});
			const preview = cell.createDiv({ cls: "toolbox-icon-preview" });
			setIcon(preview, id);
			cell.createSpan({ cls: "toolbox-icon-label", text: id });
			cell.addEventListener("click", () => void this.copyId(id));
		}
	}

	private async copyId(id: string): Promise<void> {
		try {
			await this.lib.clipboard.writeText(id);
			new Notice(`Copied ${id}.`, 2000);
		} catch (e) {
			new Notice("Copy failed: " + (e as Error).message, 6000);
		}
	}
}
