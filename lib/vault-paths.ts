import { normalizePath, type App } from "obsidian";
import type DeveloperToolboxPlugin from "../main";

// Creates a folder and every missing parent. Idempotent and tolerant of races:
// if the folder already exists (or another write created it first), it is a
// no-op rather than an error. Needed for nested paths like dev-tools/dev-issues.
export async function ensureVaultFolder(app: App, relPath: string): Promise<void> {
	const path = normalizePath(relPath);
	if (!path || path === "/" || path === ".") return;
	if (app.vault.getAbstractFileByPath(path)) return;
	let current = "";
	for (const segment of path.split("/")) {
		if (!segment) continue;
		current = current ? `${current}/${segment}` : segment;
		if (app.vault.getAbstractFileByPath(current)) continue;
		try {
			await app.vault.createFolder(current);
		} catch (e) {
			// Tolerate "already exists" (race with another write); rethrow anything else.
			if (!app.vault.getAbstractFileByPath(current)) throw e;
		}
	}
}

export async function suggestUniquePath(app: App, relPath: string): Promise<string> {
	const path = normalizePath(relPath);
	if (!app.vault.getAbstractFileByPath(path)) return path;
	const dot = path.lastIndexOf(".");
	const base = dot > 0 ? path.slice(0, dot) : path;
	const ext = dot > 0 ? path.slice(dot) : "";
	let n = 1;
	while (n < 1000) {
		const candidate = normalizePath(`${base}-${n}${ext}`);
		if (!app.vault.getAbstractFileByPath(candidate)) return candidate;
		n++;
	}
	throw new Error(`could not find a unique path for ${path} after 1000 attempts`);
}

export function buildVaultPaths(plugin: DeveloperToolboxPlugin): {
	ensureFolder(relPath: string): Promise<void>;
	suggestUnique(relPath: string): Promise<string>;
} {
	return {
		ensureFolder: (relPath: string): Promise<void> => ensureVaultFolder(plugin.app, relPath),
		suggestUnique: (relPath: string): Promise<string> => suggestUniquePath(plugin.app, relPath),
	};
}
