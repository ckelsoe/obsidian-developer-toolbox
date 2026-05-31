import { formatSection } from "../tools/diagnostics/format";
import type { DiagnosticsEntry } from "../lib/types";

const base: DiagnosticsEntry = {
	label: "reload-plugin",
	status: "ok",
	elapsedMs: null,
	timestamp: "2026-05-31T12:00:00.000Z",
	body: null,
};

describe("formatSection", () => {
	test("renders an ok entry with no elapsed and no body", () => {
		expect(formatSection(base)).toBe(
			"## reload-plugin · OK · 2026-05-31T12:00:00.000Z\n\n",
		);
	});

	test("includes the elapsed part when elapsedMs is set", () => {
		expect(formatSection({ ...base, elapsedMs: 42 })).toBe(
			"## reload-plugin · OK · 42 ms · 2026-05-31T12:00:00.000Z\n\n",
		);
	});

	test("appends the body block when a body is present", () => {
		expect(formatSection({ ...base, body: "```\nboom\n```" })).toBe(
			"## reload-plugin · OK · 2026-05-31T12:00:00.000Z\n\n```\nboom\n```\n\n",
		);
	});

	test("uppercases an error status", () => {
		expect(formatSection({ ...base, status: "error" })).toBe(
			"## reload-plugin · ERROR · 2026-05-31T12:00:00.000Z\n\n",
		);
	});

	test("uppercases an info status and keeps elapsed and body together", () => {
		expect(
			formatSection({ ...base, status: "info", elapsedMs: 7, body: "ready" }),
		).toBe("## reload-plugin · INFO · 7 ms · 2026-05-31T12:00:00.000Z\n\nready\n\n");
	});

	test("renders a zero elapsed time rather than dropping it", () => {
		expect(formatSection({ ...base, elapsedMs: 0 })).toBe(
			"## reload-plugin · OK · 0 ms · 2026-05-31T12:00:00.000Z\n\n",
		);
	});
});
