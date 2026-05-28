import type { StackedRowResult } from "../types";

export function stackedRow(
	parent: HTMLElement,
	opts: { name: string; description?: string },
): StackedRowResult {
	const row = parent.createDiv({ cls: "toolbox-stacked-row" });
	const header = row.createDiv({ cls: "toolbox-stacked-row-header" });
	header.createDiv({ cls: "toolbox-stacked-row-name", text: opts.name });
	if (opts.description) {
		header.createDiv({ cls: "toolbox-stacked-row-desc", text: opts.description });
	}
	const content = row.createDiv({ cls: "toolbox-stacked-row-content" });
	return { row, content };
}
