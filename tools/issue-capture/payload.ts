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
	feedback: "Feedback",
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

export interface IssueDocumentInputs {
	// Vault-relative path to the saved screenshot, or null when none was captured.
	screenshotPath: string | null;
	type: IssueType;
	description: string;
	context: CapturedContext;
	capturedAt: number;
}

function issueTitle(inputs: IssueDocumentInputs): string {
	const firstLine = inputs.description.trim().split("\n")[0]?.trim() ?? "";
	const summary = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
	return summary ? `${TYPE_LABELS[inputs.type]}: ${summary}` : TYPE_LABELS[inputs.type];
}

function formatStamp(epoch: number): string {
	const d = new Date(epoch);
	const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
		`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	);
}

// Builds the markdown for a saved issue note. Unlike the clipboard payload, this
// is a standalone vault note: it has a title heading, a captured-at line, and
// embeds the screenshot with an Obsidian wikilink so it renders inline.
export function buildIssueDocument(inputs: IssueDocumentInputs): string {
	const lines: string[] = [];
	lines.push(`# ${issueTitle(inputs)}`);
	lines.push("");
	lines.push(`**Type:** ${TYPE_LABELS[inputs.type]}`);
	lines.push(`**Where:** ${formatWhere(inputs.context)}`);
	lines.push(`**Context:** ${formatContext(inputs.context)}`);
	if (inputs.context.enabledPluginIds && inputs.context.enabledPluginIds.length > 0) {
		lines.push(`**Plugins enabled:** ${inputs.context.enabledPluginIds.length}`);
	}
	lines.push(`**Captured:** ${formatStamp(inputs.capturedAt)}`);

	const description = inputs.description.trim();
	if (description) {
		lines.push("");
		lines.push(description);
	}

	if (inputs.screenshotPath) {
		lines.push("");
		lines.push("## Screenshot");
		lines.push("");
		lines.push(`![[${inputs.screenshotPath}]]`);
	}

	return lines.join("\n") + "\n";
}
