import { FileSystemAdapter, Notice, type App } from "obsidian";
import type { ReloaderSettings } from "./types";
import type { ReloadLog } from "./log";
import {
	WATCHED_FILES,
	signatureFromReads,
	shouldReload,
	type ReadResult,
} from "./signature";

// Membership set for the directory-watch filter. WATCHED_FILES (shared with the
// signature helper) is the source of truth; a Set makes the per-event lookup
// cheap. Reacting only to these names ignores unrelated writes (e.g. data.json
// on a settings change), which Obsidian touches on its own.
const WATCHED_FILE_SET = new Set<string>(WATCHED_FILES);

interface FsWatcherLike {
	close(): void;
}

interface FsLike {
	watch(
		path: string,
		listener: (eventType: string, filename: string | null) => void,
	): FsWatcherLike;
	readFileSync(path: string, encoding: "utf8"): string;
}

interface PathLike {
	join(...parts: string[]): string;
}

// Mirror of the requireElectron helper in capture-page.ts: reach Node built-ins
// through window.require behind a guard, which keeps the scorecard's
// no-top-level-Node-import rule satisfied.
function requireNode<T>(id: string): T | null {
	const req = (window as { require?: (id: string) => unknown }).require;
	if (typeof req !== "function") return null;
	try {
		return req(id) as T;
	} catch {
		return null;
	}
}

export class PluginReloadWatcher {
	private watchers: FsWatcherLike[] = [];
	private timers = new Map<string, number>();
	// Node fs/path handles, resolved once in start() and reused to re-read the
	// watched files when an event fires, so a no-op change can be detected.
	private fs: FsLike | null = null;
	private path: PathLike | null = null;
	// Per-plugin absolute folder and the content signature captured when we last
	// armed or reloaded it. A watch event whose fresh signature equals the
	// baseline is a phantom / redundant write and is skipped.
	private readonly dirs = new Map<string, string>();
	private readonly baselines = new Map<string, string>();

	constructor(
		private app: App,
		private settings: ReloaderSettings,
		private onChange: (id: string) => void,
		private log: ReloadLog,
	) {}

	start(): void {
		const fs = requireNode<FsLike>("fs");
		const path = requireNode<PathLike>("path");
		const adapter = this.app.vault.adapter;
		if (!fs || !path || !(adapter instanceof FileSystemAdapter)) {
			this.diag("Auto-watch unavailable on this platform.", true);
			return;
		}
		this.fs = fs;
		this.path = path;

		const base = adapter.getBasePath();
		const watched: string[] = [];
		for (const id of this.settings.devPluginIds) {
			const manifest = this.app.plugins.manifests[id];
			if (!manifest?.dir) {
				this.diag(`Cannot watch ${id}: plugin folder not found.`, true);
				continue;
			}
			const dir = path.join(base, manifest.dir);
			this.dirs.set(id, dir);
			// Baseline the folder's build output as it is right now, which is the
			// build Obsidian already has loaded. A later event whose signature still
			// equals this baseline is a no-op and is skipped in fire().
			this.baselines.set(id, this.signatureFor(id) ?? "");
			try {
				// Watch the directory, not main.js directly. esbuild writes via
				// atomic rename, which invalidates a file-bound watch after the
				// first build. A directory watch survives the rename.
				const watcher = fs.watch(dir, (_event, filename) => {
					// Only react to the build-output files. Ignore events with no
					// filename (some platforms emit null on rename/atomic writes) and
					// writes to other files like data.json, which Obsidian touches on
					// its own and would otherwise fire phantom reloads every few minutes.
					if (!filename || !WATCHED_FILE_SET.has(filename)) return;
					this.log.append(`detected change: ${filename} (${manifest.name})`);
					this.schedule(id);
				});
				this.watchers.push(watcher);
				watched.push(manifest.name);
			} catch (e) {
				this.diag(
					`Failed to watch ${manifest.name}: ${(e as Error).message}`,
					true,
				);
			}
		}

		if (watched.length) {
			this.diag(`Watching ${watched.length} plugin(s): ${watched.join(", ")}.`);
			this.log.append(`watching ${watched.length} plugin(s): ${watched.join(", ")}`);
		}
	}

	stop(): void {
		for (const w of this.watchers) {
			try {
				w.close();
			} catch {
				// Already closed by Obsidian on unload; nothing to do.
			}
		}
		this.watchers = [];
		for (const t of this.timers.values()) window.clearTimeout(t);
		this.timers.clear();
		this.dirs.clear();
		this.baselines.clear();
	}

	// Read one watched file. `content` on success, `absent` only for a genuine
	// not-found (ENOENT), `error` for any other failure (e.g. the file locked
	// mid atomic-write). The absent/error split matters: a transient read error
	// must NOT be encoded as a stable `absent`, or a real rebuild could alias to
	// the baseline and be skipped. Callers treat `error` as "unknown -> reload".
	private readState(dir: string, name: string): ReadResult {
		if (!this.fs || !this.path) return { kind: "error" };
		try {
			return {
				kind: "content",
				text: this.fs.readFileSync(this.path.join(dir, name), "utf8"),
			};
		} catch (e) {
			const code = (e as { code?: string }).code;
			return code === "ENOENT" ? { kind: "absent" } : { kind: "error" };
		}
	}

	// Current content signature of a watched plugin's build output, or null when
	// its folder is unknown (never armed) or any file is transiently unreadable,
	// so fire() falls through to a reload rather than trusting a partial read.
	private signatureFor(id: string): string | null {
		const dir = this.dirs.get(id);
		if (dir === undefined) return null;
		return signatureFromReads((name) => this.readState(dir, name));
	}

	// Coalesce the burst of events a single build emits into one change signal.
	private schedule(id: string): void {
		const existing = this.timers.get(id);
		if (existing) window.clearTimeout(existing);
		this.timers.set(
			id,
			window.setTimeout(() => this.fire(id), this.settings.watchDebounceMs),
		);
	}

	private fire(id: string): void {
		this.timers.delete(id);
		// Skip when the watched files are byte-identical to the last armed/reloaded
		// state: a phantom fs.watch event or a redundant identical rebuild, where
		// reloading would tear down and rebuild the plugin for nothing. When a
		// signature cannot be computed (fs/path unavailable) we fall through and
		// reload, preserving the previous always-reload behavior as the safe default.
		const current = this.signatureFor(id);
		if (!shouldReload(this.baselines.get(id), current)) {
			this.log.append(`change event for ${id}; content unchanged, skipping reload`);
			return;
		}
		if (current !== null) this.baselines.set(id, current);
		this.onChange(id);
	}

	private diag(message: string, force = false): void {
		if (force || this.settings.showDiagnostics) {
			new Notice(`Reloader: ${message}`, force ? 8000 : 3000);
		}
	}
}
