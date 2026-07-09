import {
	WATCHED_FILES,
	fnv1a,
	buildSignature,
} from "../tools/reloader/signature";

// A reader backed by a plain map of name -> content. Missing key => null, i.e.
// the file is absent/unreadable, matching the watcher's readOrNull contract.
function readerFor(files: Record<string, string>): (name: string) => string | null {
	return (name) => files[name] ?? null;
}

describe("reloader signature (skip-if-unchanged)", () => {
	it("fnv1a matches the documented 32-bit FNV-1a vectors", () => {
		// Empty input is the offset basis 0x811c9dc5; "a" is the published
		// FNV-1a/32 vector 0xe40c292c. These pin the exact algorithm (constant,
		// XOR-then-multiply order, prime) so a subtle rewrite cannot pass silently.
		expect(fnv1a("")).toBe("811c9dc5");
		expect(fnv1a("a")).toBe("e40c292c");
	});

	it("fnv1a is deterministic and differs on different input", () => {
		expect(fnv1a("hello")).toBe(fnv1a("hello"));
		expect(fnv1a("hello")).not.toBe(fnv1a("hellp"));
		expect(fnv1a("")).toMatch(/^[0-9a-f]{8}$/);
	});

	it("identical build output yields identical signatures (the skip case)", () => {
		const files = {
			"main.js": "console.log(1)",
			"manifest.json": '{"version":"0.10.3"}',
			"styles.css": ".x{}",
		};
		const a = buildSignature(readerFor(files));
		const b = buildSignature(readerFor({ ...files }));
		expect(a).toBe(b);
	});

	it("a changed watched file changes the signature (the reload case)", () => {
		const base = {
			"main.js": "console.log(1)",
			"manifest.json": '{"version":"0.10.3"}',
			"styles.css": ".x{}",
		};
		const changed = { ...base, "main.js": "console.log(2)" };
		expect(buildSignature(readerFor(base))).not.toBe(
			buildSignature(readerFor(changed)),
		);
	});

	it("same hash but different length still differs (length is part of the signature)", () => {
		// Guard the theoretical case of a collision: length participates so a
		// different-length change can never alias to the same signature.
		const a = buildSignature(readerFor({ "main.js": "abc" }));
		const b = buildSignature(readerFor({ "main.js": "abcd" }));
		expect(a).not.toBe(b);
	});

	it("absent files are stable and distinct from present-but-empty", () => {
		const none = buildSignature(readerFor({}));
		const emptyMain = buildSignature(readerFor({ "main.js": "" }));
		expect(none).toBe(buildSignature(readerFor({})));
		expect(none).not.toBe(emptyMain);
		// An absent styles.css (common: not every plugin ships one) is handled.
		const noCss = buildSignature(
			readerFor({ "main.js": "x", "manifest.json": "y" }),
		);
		expect(noCss).toContain("styles.css:absent");
	});

	it("signature order is independent of reader lookup order", () => {
		const files: Record<string, string> = {
			"main.js": "a",
			"manifest.json": "b",
			"styles.css": "c",
		};
		// buildSignature visits WATCHED_FILES in its own fixed order regardless of
		// how the reader is queried, so two readers over the same content match.
		const forward = buildSignature((n) => files[n] ?? null);
		const reversed = buildSignature((n) => {
			for (const name of [...WATCHED_FILES].reverse()) {
				if (name === n) return files[n] ?? null;
			}
			return null;
		});
		expect(forward).toBe(reversed);
	});
});
