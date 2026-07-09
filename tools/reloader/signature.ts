// Pure content-signature helper for the plugin-reload watcher. No obsidian or
// Node imports so it stays unit-testable; the watcher injects a file reader.
//
// The watcher fires a reload only when a watched build-output file actually
// changed on disk. `fs.watch` (especially on Windows) delivers events for
// metadata touches, atomic-rename settling, and antivirus/indexer access, and
// can emit a phantom event right after the watch is armed. Reloading on those
// tears down and rebuilds the plugin for no reason (freezing the UI). Comparing
// a content signature before/after an event suppresses every no-op reload.

// The build-output files a rebuild touches. A write to anything else in the
// plugin folder (e.g. data.json on a settings change) is ignored.
export const WATCHED_FILES = ["main.js", "manifest.json", "styles.css"] as const;

// FNV-1a-style 32-bit hash over a JS string, hex. NOTE: it XORs UTF-16 code
// units (charCodeAt), not UTF-8 bytes, so it equals canonical byte-wise FNV-1a
// only for ASCII input. That is irrelevant to our use (did this file change?):
// it stays deterministic and collision-resistant enough for change detection.
// Paired with the string length in the signature below, aliasing is negligible.
export function fnv1a(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		// hash *= 16777619, via shifts to stay in 32-bit unsigned range.
		hash =
			(hash +
				((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>>
			0;
	}
	return hash.toString(16).padStart(8, "0");
}

// Build a stable signature of the watched files from a reader that returns each
// file's UTF-8 content, or null when the file is absent or unreadable. Files are
// visited in a fixed order so the signature does not depend on reader ordering.
// A file's entry carries both its length and hash so a same-hash/different-length
// change (or an absent -> present transition) still registers as a difference.
export function buildSignature(read: (name: string) => string | null): string {
	const parts: string[] = [];
	for (const name of WATCHED_FILES) {
		const content = read(name);
		parts.push(
			content === null
				? `${name}:absent`
				: `${name}:${content.length}:${fnv1a(content)}`,
		);
	}
	return parts.join(";");
}

// The outcome of reading one watched file: real content, a genuine absence
// (ENOENT), or a transient error (e.g. locked mid atomic-write). The absent vs
// error split is load-bearing: an error must NOT be encoded as a stable
// `absent`, or a real rebuild could alias to the baseline and be skipped.
export type ReadResult =
	| { kind: "content"; text: string }
	| { kind: "absent" }
	| { kind: "error" };

// Build a signature from per-file read results, or null when ANY watched file is
// unreadable (an error, as opposed to a genuine absence). Null means "unknown",
// so the caller reloads rather than trusting a partial read. A genuine absence
// is stable and participates in the signature as `name:absent`.
export function signatureFromReads(read: (name: string) => ReadResult): string | null {
	let unreadable = false;
	const signature = buildSignature((name) => {
		const result = read(name);
		if (result.kind === "error") {
			unreadable = true;
			return null;
		}
		return result.kind === "content" ? result.text : null;
	});
	return unreadable ? null : signature;
}

// The skip-vs-reload decision: reload unless the current signature is known
// (non-null) and byte-identical to the baseline. An unknown current signature
// (null) always reloads, the safe default.
export function shouldReload(
	baseline: string | undefined,
	current: string | null,
): boolean {
	return !(current !== null && current === baseline);
}
