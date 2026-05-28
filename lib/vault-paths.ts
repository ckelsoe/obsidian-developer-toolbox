import { normalizePath } from "obsidian";
import type DeveloperToolboxPlugin from "../main";

export function buildVaultPaths(plugin: DeveloperToolboxPlugin): {
	ensureFolder(relPath: string): Promise<void>;
	suggestUnique(relPath: string): Promise<string>;
} {
	return {
		async ensureFolder(relPath: string): Promise<void> {
			const path = normalizePath(relPath);
			const existing = plugin.app.vault.getAbstractFileByPath(path);
			if (!existing) {
				await plugin.app.vault.createFolder(path);
			}
		},
		async suggestUnique(relPath: string): Promise<string> {
			const path = normalizePath(relPath);
			if (!plugin.app.vault.getAbstractFileByPath(path)) return path;
			const dot = path.lastIndexOf(".");
			const base = dot > 0 ? path.slice(0, dot) : path;
			const ext = dot > 0 ? path.slice(dot) : "";
			let n = 1;
			while (n < 1000) {
				const candidate = normalizePath(`${base}-${n}${ext}`);
				if (!plugin.app.vault.getAbstractFileByPath(candidate)) return candidate;
				n++;
			}
			throw new Error(`could not find a unique path for ${path} after 1000 attempts`);
		},
	};
}
