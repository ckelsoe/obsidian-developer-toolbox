import { formatBlob, formatFieldValue, formatRowSummary } from "../tools/state-inspector/format";
import type { CapturedContext } from "../lib/types";

const baseContext: CapturedContext = {
	obsidianVersion: "1.12.7",
	electronVersion: "39.8.3",
	osFamily: "windows",
	vaultName: "obs-test-vault",
	activeFile: "README.md",
	activeViewMode: "live-preview",
	activeLeafType: "markdown",
	enabledPluginIds: ["dataview", "templater-obsidian"],
};

describe("formatFieldValue", () => {
	test("returns plain string fields verbatim", () => {
		expect(formatFieldValue(baseContext, "obsidianVersion")).toBe("1.12.7");
		expect(formatFieldValue(baseContext, "electronVersion")).toBe("39.8.3");
		expect(formatFieldValue(baseContext, "osFamily")).toBe("windows");
		expect(formatFieldValue(baseContext, "activeFile")).toBe("README.md");
	});

	test("renders the plugin list as count then newline-joined ids", () => {
		expect(formatFieldValue(baseContext, "enabledPluginIds")).toBe(
			"2\ndataview\ntemplater-obsidian",
		);
	});

	test("renders an empty plugin list as 0", () => {
		expect(formatFieldValue({ ...baseContext, enabledPluginIds: [] }, "enabledPluginIds")).toBe("0");
	});

	test("uses the not-included placeholder when the plugin list is null", () => {
		expect(formatFieldValue({ ...baseContext, enabledPluginIds: null }, "enabledPluginIds")).toBe(
			"(not included)",
		);
	});

	test("uses the not-included placeholder when the vault name is null", () => {
		expect(formatFieldValue({ ...baseContext, vaultName: null }, "vaultName")).toBe("(not included)");
	});

	test("uses a no-active-file placeholder when there is no file", () => {
		expect(formatFieldValue({ ...baseContext, activeFile: null }, "activeFile")).toBe(
			"(no active file)",
		);
	});

	test("hides an unknown view mode behind a placeholder", () => {
		expect(formatFieldValue({ ...baseContext, activeViewMode: "unknown" }, "activeViewMode")).toBe(
			"(unknown)",
		);
	});
});

describe("formatRowSummary", () => {
	test("collapses the plugin list to a count for the single-line row", () => {
		expect(formatRowSummary(baseContext, "enabledPluginIds")).toBe("2");
	});

	test("matches formatFieldValue for non-list fields", () => {
		expect(formatRowSummary(baseContext, "activeFile")).toBe("README.md");
	});
});

describe("formatBlob", () => {
	test("emits one labeled line per field with the plugin list expanded", () => {
		const blob = formatBlob(baseContext);
		expect(blob).toContain("Obsidian version: 1.12.7");
		expect(blob).toContain("Electron version: 39.8.3");
		expect(blob).toContain("Operating system: windows");
		expect(blob).toContain("Vault name: obs-test-vault");
		expect(blob).toContain("Active file: README.md");
		expect(blob).toContain("View mode: live-preview");
		expect(blob).toContain("Leaf type: markdown");
		expect(blob).toContain("Enabled plugins (2):");
		expect(blob).toContain("  dataview");
		expect(blob).toContain("  templater-obsidian");
	});

	test("collapses a null plugin list to the placeholder, no expansion", () => {
		const blob = formatBlob({ ...baseContext, enabledPluginIds: null });
		expect(blob).toContain("Enabled plugins: (not included)");
		expect(blob).not.toContain("Enabled plugins (");
	});
});
