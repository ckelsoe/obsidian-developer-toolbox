import type { CapturedContext } from "../../lib/types";
import type { IssueType } from "./types";

export interface PayloadInputs {
	screenshotPath: string | null;
	type: IssueType;
	description: string;
	context: CapturedContext;
}

const TYPE_LABELS: Record<IssueType, string> = {
	defect: "Defect",
	enhancement: "Enhancement",
	question: "Question",
	task: "Task",
	note: "Note",
};

function formatContext(context: CapturedContext): string {
	const fragments: string[] = [];
	fragments.push(`Obsidian ${context.obsidianVersion}`);
	fragments.push(context.osFamily);
	if (context.vaultName) fragments.push(`vault: ${context.vaultName}`);
	return fragments.join(" / ");
}

function formatWhere(context: CapturedContext): string {
	if (!context.activeFile) {
		return context.activeLeafType ?? "no active leaf";
	}
	const mode = context.activeViewMode === "unknown" ? "" : ` (${context.activeViewMode})`;
	return `${context.activeFile}${mode}`;
}

export function buildPayload(inputs: PayloadInputs): string {
	const lines: string[] = [];

	if (inputs.screenshotPath) {
		lines.push(`![screenshot](${inputs.screenshotPath})`);
		lines.push("");
	}

	lines.push(`**Type:** ${TYPE_LABELS[inputs.type]}`);
	lines.push(`**Where:** ${formatWhere(inputs.context)}`);
	lines.push(`**Context:** ${formatContext(inputs.context)}`);

	if (inputs.context.enabledPluginIds && inputs.context.enabledPluginIds.length > 0) {
		lines.push(`**Plugins enabled:** ${inputs.context.enabledPluginIds.length}`);
	}

	const description = inputs.description.trim();
	if (description) {
		lines.push("");
		lines.push(description);
	}

	return lines.join("\n");
}
