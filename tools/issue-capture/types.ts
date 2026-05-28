export type IssueType = "defect" | "enhancement" | "question" | "task" | "note";

export const ISSUE_TYPES: readonly { id: IssueType; label: string }[] = [
	{ id: "defect", label: "Defect" },
	{ id: "enhancement", label: "Enhancement" },
	{ id: "question", label: "Question" },
	{ id: "task", label: "Task" },
	{ id: "note", label: "Note" },
];

export interface IssueCaptureSettings {
	enabled: boolean;
	delayedCaptureSeconds: number;
	defaultIssueType: IssueType;
	screenshotFolder: string;
	redactHomePath: boolean;
	includePluginList: boolean;
	includeVaultName: boolean;
	pathStyle: "basename" | "vault-relative" | "absolute";
}

export const DEFAULT_ISSUE_CAPTURE_SETTINGS: IssueCaptureSettings = {
	enabled: true,
	delayedCaptureSeconds: 3,
	defaultIssueType: "defect",
	screenshotFolder: "dev-screenshots",
	redactHomePath: true,
	includePluginList: true,
	includeVaultName: true,
	pathStyle: "vault-relative",
};
