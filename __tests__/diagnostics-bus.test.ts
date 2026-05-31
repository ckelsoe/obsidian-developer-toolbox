import { buildDiagnosticsBus, formatBody, formatError } from "../lib/diagnostics";
import type { DiagnosticsEntry } from "../lib/types";

describe("formatBody", () => {
	test("maps undefined to null", () => {
		expect(formatBody(undefined)).toBeNull();
	});

	test("passes a string through verbatim", () => {
		expect(formatBody("already formatted")).toBe("already formatted");
	});

	test("renders an object as a fenced JSON block", () => {
		expect(formatBody({ a: 1, b: "two" })).toBe(
			'```json\n{\n  "a": 1,\n  "b": "two"\n}\n```',
		);
	});
});

describe("formatError", () => {
	test("uses name, message, and stack for a real Error", () => {
		const err = new Error("boom");
		err.stack = "Error: boom\n    at somewhere";
		const out = formatError(err);
		expect(out).toBe("```\nError: boom\nError: boom\n    at somewhere\n```");
	});

	test("falls back to the head line when an Error has no stack", () => {
		const err = new Error("no stack");
		err.stack = undefined;
		expect(formatError(err)).toBe("```\nError: no stack\n```");
	});

	test("stringifies a non-Error value", () => {
		expect(formatError("just a string")).toBe("```\njust a string\n```");
		expect(formatError(42)).toBe("```\n42\n```");
	});
});

describe("buildDiagnosticsBus", () => {
	test("drops entries when no sink is attached", () => {
		const bus = buildDiagnosticsBus();
		expect(bus.hasSink()).toBe(false);
		// Must not throw with no sink.
		expect(() => bus.append("noop")).not.toThrow();
	});

	test("forwards a built entry to the attached sink", () => {
		const bus = buildDiagnosticsBus();
		const seen: DiagnosticsEntry[] = [];
		bus.attachSink((e) => seen.push(e));
		expect(bus.hasSink()).toBe(true);

		bus.append("did-thing", { status: "ok", elapsedMs: 5, body: { ok: true } });
		expect(seen).toHaveLength(1);
		const entry = seen[0];
		if (!entry) throw new Error("expected one entry");
		expect(entry.label).toBe("did-thing");
		expect(entry.status).toBe("ok");
		expect(entry.elapsedMs).toBe(5);
		expect(entry.body).toBe('```json\n{\n  "ok": true\n}\n```');
		expect(typeof entry.timestamp).toBe("string");
	});

	test("defaults status to ok and elapsedMs to null", () => {
		const bus = buildDiagnosticsBus();
		const seen: DiagnosticsEntry[] = [];
		bus.attachSink((e) => seen.push(e));
		bus.append("bare");
		const entry = seen[0];
		if (!entry) throw new Error("expected one entry");
		expect(entry.status).toBe("ok");
		expect(entry.elapsedMs).toBeNull();
		expect(entry.body).toBeNull();
	});

	test("appendError records an error status with a fenced body", () => {
		const bus = buildDiagnosticsBus();
		const seen: DiagnosticsEntry[] = [];
		bus.attachSink((e) => seen.push(e));
		bus.appendError("failed-thing", new Error("kaboom"), { elapsedMs: 3 });
		const entry = seen[0];
		if (!entry) throw new Error("expected one entry");
		expect(entry.status).toBe("error");
		expect(entry.elapsedMs).toBe(3);
		expect(entry.body).toContain("Error: kaboom");
	});

	test("detach clears the sink so later entries are dropped", () => {
		const bus = buildDiagnosticsBus();
		const seen: DiagnosticsEntry[] = [];
		const detach = bus.attachSink((e) => seen.push(e));
		bus.append("first");
		detach();
		expect(bus.hasSink()).toBe(false);
		bus.append("second");
		expect(seen.map((e) => e.label)).toEqual(["first"]);
	});
});
