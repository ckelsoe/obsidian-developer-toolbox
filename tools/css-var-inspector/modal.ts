import { App, ButtonComponent, Modal, Notice, TextComponent } from "obsidian";
import type { ToolboxLib } from "../../lib/types";
import type DeveloperToolboxPlugin from "../../main";
import { collectCssVars } from "./collect";
import { filterCssVars, formatBlob, formatVarLine } from "./format";
import type { CssVar } from "./types";

interface CssVarInspectorOpts {
	lib: ToolboxLib;
}

// Cap rendered rows so a theme with hundreds of variables does not jank the first
// paint. The search box narrows past the cap; the count line says when truncated.
const DISPLAY_CAP = 400;

// A searchable, copyable dump of every CSS custom property the active theme and
// Obsidian define, with current computed values. Standard CSSOM, no Obsidian API.
export class CssVarInspectorModal extends Modal {
	private lib: ToolboxLib;
	private allVars: CssVar[];
	private list!: HTMLElement;
	private countEl!: HTMLElement;
	private matches: CssVar[] = [];

	constructor(app: App, _plugin: DeveloperToolboxPlugin, opts: CssVarInspectorOpts) {
		super(app);
		this.lib = opts.lib;
		// Collect once on open (the scan is O(rules); do not repeat per keystroke).
		this.allVars = collectCssVars(activeDocument);
	}

	onOpen(): void {
		this.titleEl.setText("CSS variable inspector");

		const { contentEl } = this;
		contentEl.empty();

		const search = new TextComponent(contentEl);
		search.setPlaceholder("Search variables by name or value");
		search.inputEl.addClass("toolbox-cssvar-search");
		search.onChange((value) => this.renderList(value));

		this.countEl = contentEl.createDiv({ cls: "toolbox-cssvar-count" });
		this.list = contentEl.createDiv({ cls: "toolbox-cssvar-list" });

		this.renderButtons(contentEl);
		this.renderList("");
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderList(query: string): void {
		this.matches = filterCssVars(this.allVars, query);
		const shown = this.matches.slice(0, DISPLAY_CAP);

		this.countEl.setText(
			shown.length < this.matches.length
				? `Showing first ${shown.length} of ${this.matches.length} matches. Refine the search to narrow.`
				: `${this.matches.length} variables`,
		);

		this.list.empty();
		const fragment = activeDocument.createDocumentFragment();
		for (const v of shown) {
			const row = fragment.createDiv({
				cls: "toolbox-cssvar-row",
				attr: { "aria-label": `Copy ${v.name}`, title: formatVarLine(v) },
			});
			row.createSpan({ cls: "toolbox-cssvar-name", text: v.name });
			row.createSpan({
				cls: "toolbox-cssvar-value",
				text: v.value || "(unset in current theme)",
			});
			row.addEventListener("click", () => void this.copyLine(v));
		}
		this.list.appendChild(fragment);
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
