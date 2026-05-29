export type IssueType = "defect" | "enhancement" | "feedback" | "question" | "task" | "note";

export const ISSUE_TYPES: readonly { id: IssueType; label: string }[] = [
	{ id: "defect", label: "Defect" },
	{ id: "enhancement", label: "Enhancement" },
	{ id: "feedback", label: "Feedback" },
	{ id: "question", label: "Question" },
	{ id: "task", label: "Task" },
	{ id: "note", label: "Note" },
];

import type { SerializedAnnotations } from "./annotation/types";

// D3: a paused annotation session. Holds the original (unflattened) screenshot
// plus the editable annotation model so reopening restores editable objects
// rather than a baked PNG.
export interface AnnotationDraft {
	imageDataUrl: string;
	capturedAt: number;
	serialized: SerializedAnnotations;
}

export interface IssueCaptureSettings {
	enabled: boolean;
	immediateSettleMs: number;
	delayedCaptureSeconds: number;
	defaultIssueType: IssueType;
	screenshotSubfolder: string;
	saveIssueFile: boolean;
	issueSubfolder: string;
	redactHomePath: boolean;
	includePluginList: boolean;
	includeVaultName: boolean;
	pathStyle: "basename" | "vault-relative" | "absolute";
	// D3 draft persistence.
	saveAnnotationDraft: boolean;
	annotationDraft: AnnotationDraft | null;
}

export const DEFAULT_ISSUE_CAPTURE_SETTINGS: IssueCaptureSettings = {
	enabled: true,
	immediateSettleMs: 300,
	delayedCaptureSeconds: 5,
	defaultIssueType: "defect",
	screenshotSubfolder: "dev-screenshots",
	saveIssueFile: true,
	issueSubfolder: "dev-issues",
	redactHomePath: true,
	includePluginList: true,
	includeVaultName: true,
	pathStyle: "vault-relative",
	saveAnnotationDraft: true,
	annotationDraft: null,
};
