import type { EventRef, TAbstractFile, WorkspaceLeaf } from "obsidian";
import type { Disposable, ToolContext, ToolHandle } from "../types";
import { DEFAULT_EVENT_SPY_SETTINGS, type EventSpySettings } from "./types";
import { describeFile, describeLeaf, describeRename, spyLabel } from "./format";
import { renderEventSpySettings } from "./settings";

type Ctx = ToolContext<EventSpySettings>;

const eventSpy: ToolHandle<EventSpySettings> = {
	id: "event-spy",
	displayName: "Event spy",
	defaultSettings: DEFAULT_EVENT_SPY_SETTINGS,

	register(ctx: Ctx): Disposable {
		// Track each EventRef on the bus it came from so dispose offrefs it on the
		// correct emitter. workspace.offref and vault.offref are distinct.
		const workspaceRefs: EventRef[] = [];
		const vaultRefs: EventRef[] = [];

		const record = (label: string, body: Record<string, unknown>): void => {
			ctx.lib.diagnostics.append(label, { status: "info", body });
		};

		// The diagnostics log tool writes its markdown file inside the storage root.
		// That write fires vault create/modify events. If we logged those, each log
		// line would trigger another write, firing another event, forever. Skip any
		// vault file whose path is at or under the storage root to break that loop.
		const root = ctx.lib.storage.root();
		const underStorageRoot = (path: string): boolean =>
			path === root || path.startsWith(`${root}/`);

		if (ctx.settings.workspaceEvents) {
			workspaceRefs.push(
				ctx.app.workspace.on("file-open", (file) => {
					record(spyLabel("workspace", "file-open"), describeFile(file));
				}),
			);
			workspaceRefs.push(
				ctx.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf | null) => {
					record(
						spyLabel("workspace", "active-leaf-change"),
						describeLeaf(leaf?.view?.getViewType?.() ?? null),
					);
				}),
			);
			workspaceRefs.push(
				ctx.app.workspace.on("layout-change", () => {
					record(spyLabel("workspace", "layout-change"), {});
				}),
			);
		}

		if (ctx.settings.editorChanges) {
			workspaceRefs.push(
				ctx.app.workspace.on("editor-change", (_editor, info) => {
					// info is a MarkdownView or MarkdownFileInfo; read file defensively.
					record(spyLabel("workspace", "editor-change"), {
						file: info?.file?.path ?? null,
					});
				}),
			);
		}

		if (ctx.settings.vaultEvents) {
			const logFile = (event: string, file: TAbstractFile): void => {
				if (underStorageRoot(file.path)) return;
				record(spyLabel("vault", event), describeFile(file));
			};
			vaultRefs.push(ctx.app.vault.on("create", (file) => logFile("create", file)));
			vaultRefs.push(ctx.app.vault.on("modify", (file) => logFile("modify", file)));
			vaultRefs.push(ctx.app.vault.on("delete", (file) => logFile("delete", file)));
			vaultRefs.push(
				ctx.app.vault.on("rename", (file, oldPath) => {
					// Guard both the new and old paths: a rename out of storage still
					// would not loop, but a rename inside storage must stay quiet.
					if (underStorageRoot(file.path) || underStorageRoot(oldPath)) return;
					record(spyLabel("vault", "rename"), describeRename(file, oldPath));
				}),
			);
		}

		return {
			dispose: (): void => {
				for (const ref of workspaceRefs) ctx.app.workspace.offref(ref);
				for (const ref of vaultRefs) ctx.app.vault.offref(ref);
			},
		};
	},

	renderSettings(container: HTMLElement, ctx: Ctx): void {
		renderEventSpySettings(container, ctx);
	},
};

export default eventSpy;
