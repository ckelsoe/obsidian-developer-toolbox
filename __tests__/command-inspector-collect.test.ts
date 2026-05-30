import {
	buildCommandRows,
	deriveOwning,
	filterCommands,
	formatHotkey,
	formatRow,
	type CommandLike,
} from "../tools/command-inspector/collect";

const manifests = {
	"developer-toolbox": { name: "Developer Toolbox" },
	dataview: { name: "Dataview" },
};

describe("deriveOwning", () => {
	test("splits a plugin command on the first colon and maps to the manifest name", () => {
		expect(deriveOwning("developer-toolbox:inspect-commands", manifests)).toEqual({
			owningPlugin: "Developer Toolbox",
			action: "inspect-commands",
		});
	});

	test("keeps a colon inside the action", () => {
		expect(deriveOwning("dataview:foo:bar", manifests)).toEqual({
			owningPlugin: "Dataview",
			action: "foo:bar",
		});
	});

	test("falls back to the raw namespace for core commands not in manifests", () => {
		expect(deriveOwning("editor:toggle-bold", manifests)).toEqual({
			owningPlugin: "editor",
			action: "toggle-bold",
		});
	});

	test("handles an id with no colon", () => {
		expect(deriveOwning("standalone", manifests)).toEqual({
			owningPlugin: "standalone",
			action: "standalone",
		});
	});
});

describe("formatHotkey", () => {
	test("joins modifiers and key with plus", () => {
		expect(formatHotkey({ modifiers: ["Mod", "Shift"], key: "P" })).toBe("Mod+Shift+P");
	});

	test("renders a bare key with no modifiers", () => {
		expect(formatHotkey({ modifiers: [], key: "F2" })).toBe("F2");
	});
});

describe("buildCommandRows hotkey precedence", () => {
	const commands: Record<string, CommandLike> = {
		"dataview:refresh": {
			id: "dataview:refresh",
			name: "Refresh",
			hotkeys: [{ modifiers: ["Mod"], key: "R" }],
		},
	};

	test("uses the command's declared hotkey when no custom or default override exists", () => {
		const rows = buildCommandRows(commands, manifests, {}, {});
		expect(rows[0]?.hotkeys).toEqual(["Mod+R"]);
	});

	test("a default override wins over the declared hotkey", () => {
		const rows = buildCommandRows(commands, manifests, {}, {
			"dataview:refresh": [{ modifiers: ["Alt"], key: "R" }],
		});
		expect(rows[0]?.hotkeys).toEqual(["Alt+R"]);
	});

	test("a user custom override wins over everything", () => {
		const rows = buildCommandRows(
			commands,
			manifests,
			{ "dataview:refresh": [{ modifiers: ["Mod", "Shift"], key: "R" }] },
			{ "dataview:refresh": [{ modifiers: ["Alt"], key: "R" }] },
		);
		expect(rows[0]?.hotkeys).toEqual(["Mod+Shift+R"]);
	});

	test("an explicit empty custom override clears the binding (user removed it)", () => {
		const rows = buildCommandRows(commands, manifests, { "dataview:refresh": [] }, {});
		expect(rows[0]?.hotkeys).toEqual([]);
	});

	test("sorts rows by id", () => {
		const multi: Record<string, CommandLike> = {
			"z:last": { id: "z:last", name: "Z" },
			"a:first": { id: "a:first", name: "A" },
		};
		const rows = buildCommandRows(multi, manifests, {}, {});
		expect(rows.map((r) => r.id)).toEqual(["a:first", "z:last"]);
	});
});

describe("filterCommands", () => {
	const rows = buildCommandRows(
		{
			"dataview:refresh": { id: "dataview:refresh", name: "Refresh", hotkeys: [{ modifiers: ["Mod"], key: "R" }] },
			"editor:toggle-bold": { id: "editor:toggle-bold", name: "Bold" },
		},
		manifests,
		{},
		{},
	);

	test("returns all rows for an empty query", () => {
		expect(filterCommands(rows, "")).toHaveLength(2);
	});

	test("matches on id", () => {
		expect(filterCommands(rows, "toggle-bold").map((r) => r.id)).toEqual(["editor:toggle-bold"]);
	});

	test("matches on owning plugin name", () => {
		expect(filterCommands(rows, "dataview").map((r) => r.id)).toEqual(["dataview:refresh"]);
	});

	test("matches on hotkey text", () => {
		expect(filterCommands(rows, "mod+r").map((r) => r.id)).toEqual(["dataview:refresh"]);
	});
});

describe("formatRow", () => {
	test("renders id, plugin, and hotkeys tab-separated, with a no-hotkey marker", () => {
		const rows = buildCommandRows(
			{ "editor:toggle-bold": { id: "editor:toggle-bold", name: "Bold" } },
			manifests,
			{},
			{},
		);
		const row = rows[0];
		if (!row) throw new Error("expected at least one command row");
		expect(formatRow(row)).toBe("editor:toggle-bold\teditor\tno hotkey");
	});
});
