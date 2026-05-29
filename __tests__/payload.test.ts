import { buildPayload, buildIssueDocument } from "../tools/issue-capture/payload";
import type { CapturedContext } from "../lib/types";

const baseContext: CapturedContext = {
	obsidianVersion: "1.12.7",
	osFamily: "windows",
	vaultName: "obs-test-vault",
	activeFile: "README.md",
	activeViewMode: "live-preview",
	activeLeafType: "markdown",
	enabledPluginIds: ["dataview", "templater-obsidian"],
};

describe("buildPayload", () => {
	test("includes image, type, where, context, plugin count, and description", () => {
		const payload = buildPayload({
			screenshotPath: "<vault>/dev-screenshots/2026-05-28-x.png",
			type: "defect",
			description: "Bug: foo doesn't bar",
			context: baseContext,
		});

		expect(payload).toContain("![screenshot](<vault>/dev-screenshots/2026-05-28-x.png)");
		expect(payload).toContain("**Type:** Defect");
		expect(payload).toContain("**Where:** README.md (live-preview)");
		expect(payload).toContain("**Context:** Obsidian 1.12.7 / windows / vault: obs-test-vault");
		expect(payload).toContain("**Plugins enabled:** 2");
		expect(payload).toContain("Bug: foo doesn't bar");
	});

	test("omits image line when no screenshot path", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "question",
			description: "Where does X live?",
			context: baseContext,
		});

		expect(payload).not.toContain("![screenshot]");
		expect(payload).toContain("**Type:** Question");
		expect(payload).toContain("Where does X live?");
	});

	test("omits description block when empty", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "note",
			description: "   ",
			context: baseContext,
		});

		expect(payload).not.toMatch(/\n\n[^*]/);
	});

	test("omits Plugins line when enabledPluginIds is null or empty", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "note",
			description: "x",
			context: { ...baseContext, enabledPluginIds: null },
		});
		expect(payload).not.toContain("**Plugins enabled:**");
	});

	test("uses activeLeafType when no active file", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "note",
			description: "",
			context: { ...baseContext, activeFile: null, activeLeafType: "graph" },
		});
		expect(payload).toContain("**Where:** graph");
	});

	test("hides view-mode parenthesis when mode is unknown", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "note",
			description: "",
			context: { ...baseContext, activeViewMode: "unknown" },
		});
		expect(payload).toContain("**Where:** README.md");
		expect(payload).not.toContain("(unknown)");
	});

	test("omits vault name when null", () => {
		const payload = buildPayload({
			screenshotPath: null,
			type: "note",
			description: "",
			context: { ...baseContext, vaultName: null },
		});
		expect(payload).toContain("**Context:** Obsidian 1.12.7 / windows");
		expect(payload).not.toContain("vault:");
	});
});

describe("buildIssueDocument", () => {
	test("builds a titled note with metadata and an embedded screenshot", () => {
		const doc = buildIssueDocument({
			screenshotPath: "dev-tools/dev-screenshots/2026-05-29-101500.png",
			type: "defect",
			description: "Pin click clears the highlight underneath",
			context: baseContext,
			capturedAt: 0,
		});

		expect(doc).toContain("# Defect: Pin click clears the highlight underneath");
		expect(doc).toContain("**Type:** Defect");
		expect(doc).toContain("**Where:** README.md (live-preview)");
		expect(doc).toContain("**Captured:** ");
		expect(doc).toContain("## Screenshot");
		expect(doc).toContain("![[dev-tools/dev-screenshots/2026-05-29-101500.png]]");
	});

	test("omits the screenshot section when there is no screenshot", () => {
		const doc = buildIssueDocument({
			screenshotPath: null,
			type: "question",
			description: "How does X work?",
			context: baseContext,
			capturedAt: 0,
		});

		expect(doc).toContain("# Question: How does X work?");
		expect(doc).not.toContain("## Screenshot");
		expect(doc).not.toContain("![[");
	});

	test("falls back to the type label as title when description is empty", () => {
		const doc = buildIssueDocument({
			screenshotPath: null,
			type: "note",
			description: "   ",
			context: baseContext,
			capturedAt: 0,
		});

		expect(doc).toMatch(/^# Note\n/);
	});
});
