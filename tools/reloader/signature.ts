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

// FNV-1a 32-bit hash over a string, hex. Deterministic and dependency-free.
// Paired with the byte length in the signature below, collisions are negligible
// for the only question we ask: did this build output change?
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
