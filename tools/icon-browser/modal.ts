import { App, Modal, Notice, TextComponent, getIconIds, setIcon } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { filterIcons, sortIcons } from "./collect";

interface IconBrowserOpts {
	lib: ToolboxLib;
}

// Cap the number of rendered cells. getIconIds() returns ~1500+ ids and each
// setIcon call builds an SVG, so rendering the whole set eagerly janks the first
// paint. The user narrows past the cap with the search box; the count line says
// when results are truncated.
const DISPLAY_CAP = 300;

// Browse and copy Lucide / Obsidian icon ids usable in setIcon and addRibbonIcon.
// getIconIds() and setIcon() are public module exports (obsidian.d.ts:3233, :5517).
export class IconBrowserModal extends Modal {
	private lib: ToolboxLib;
	private allIds: string[];
	private grid!: HTMLElement;
	private countEl!: HTMLElement;

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: IconBrowserOpts) {
		super(app);
		this.lib = opts.lib;
		// Enumerate live and sort once. Never hardcode: the set is runtime
		// dependent (core icons plus any addIcon registrations from other plugins).
		this.allIds = sortIcons(getIconIds());
	}

	onOpen(): void {
		this.titleEl.setText("Icon browser");

		const { contentEl } = this;
		contentEl.empty();

		const search = new TextComponent(contentEl);
		search.setPlaceholder("Search icons by ID");
		search.inputEl.addClass("toolbox-icon-search");
		search.onChange((value) => this.renderGrid(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-icon-count" });
		this.grid = contentEl.createDiv({ cls: "toolbox-icon-grid" });

		this.renderGrid("");
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderGrid(query: string): void {
		const matches = filterIcons(this.allIds, query);
		const shown = matches.slice(0, DISPLAY_CAP);

		this.countEl.setText(
			shown.length < matches.length
				? `Showing first ${shown.length} of ${matches.length} matches. Refine the search to narrow.`
				: `${matches.length} icons`,
		);

		this.grid.empty();
		const fragment = activeDocument.createDocumentFragment();
		for (const id of shown) {
			const cell = fragment.createDiv({
				cls: "toolbox-icon-cell",
				attr: { "aria-label": `Copy ${id}`, title: id },
			});
			const preview = cell.createDiv({ cls: "toolbox-icon-preview" });
			setIcon(preview, id);
			cell.createSpan({ cls: "toolbox-icon-label", text: id });
			cell.addEventListener("click", () => void this.copyId(id));
		}
		this.grid.appendChild(fragment);
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
