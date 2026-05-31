import {
	describeFile,
	describeLeaf,
	describeRename,
	spyLabel,
} from "../tools/event-spy/format";

describe("spyLabel", () => {
	test("joins the bus and event with a colon", () => {
		expect(spyLabel("workspace", "file-open")).toBe("workspace:file-open");
		expect(spyLabel("vault", "rename")).toBe("vault:rename");
	});
});

describe("describeFile", () => {
	test("reports the path when a file is present", () => {
		expect(describeFile({ path: "notes/a.md", name: "a.md" })).toEqual({ path: "notes/a.md" });
	});

	test("reports null for a missing file", () => {
		expect(describeFile(null)).toEqual({ path: null });
		expect(describeFile(undefined)).toEqual({ path: null });
	});

	test("reports null when the file has no path", () => {
		expect(describeFile({ name: "a.md" })).toEqual({ path: null });
	});
});

describe("describeRename", () => {
	test("records the old and new paths", () => {
		expect(describeRename({ path: "notes/new.md" }, "notes/old.md")).toEqual({
			from: "notes/old.md",
			to: "notes/new.md",
		});
	});

	test("records null for a missing target path", () => {
		expect(describeRename(null, "notes/old.md")).toEqual({
			from: "notes/old.md",
			to: null,
		});
	});
});

describe("describeLeaf", () => {
	test("records the view type", () => {
		expect(describeLeaf("markdown")).toEqual({ viewType: "markdown" });
	});

	test("records null when the view type is unknown", () => {
		expect(describeLeaf(null)).toEqual({ viewType: null });
	});
});
