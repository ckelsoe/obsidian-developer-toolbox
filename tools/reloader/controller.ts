import { Notice } from "obsidian";
import type { ToolContext } from "../types";
import type { ReloaderSettings } from "./types";
import { PluginReloadWatcher } from "./watcher";
import { reloadPlugin, reloadedLabel, type ReloadResult } from "./reload";
import { readPluginVersionFromDisk } from "../../lib/manifest-version";

type Ctx = ToolContext<ReloaderSettings>;

type ReloadState = "ready" | "dirty" | "done";

function nowHms(): string {
	const d = new Date();
	const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Owns the watcher lifecycle, the visible indicators (ribbon icon + status bar
// text), and the reload actions for one active tool instance. Exposes a restart
// hook so the settings UI can re-arm the watcher after the dev-plugin list or
// the auto-reload toggle changes.
export class ReloaderController {
	private watcher: PluginReloadWatcher | null = null;
	private iconEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private doneTimer: number | null = null;
	private state: ReloadState = "ready";
	// The running toolbox build's version, read from disk so it stays accurate
	// across a live self-reload. Shown persistently in the status bar.
	private version = "";
	// When this controller instance loaded. Updates on every self-reload, so the
	// status bar confirms a reload happened even when the version did not change.
	private readonly loadedAt = nowHms();

	constructor(private ctx: Ctx) {}

	attachIcon(el: HTMLElement): void {
		this.iconEl = el;
	}

	attachStatusBar(el: HTMLElement): void {
		this.statusEl = el;
		el.addClass("toolbox-reloader-status");
		this.setState("ready");
		void this.refreshVersion();
	}

	private async refreshVersion(): Promise<void> {
		const v = await readPluginVersionFromDisk(this.ctx.app, this.ctx.plugin.manifest.id);
		this.version = v ?? this.ctx.plugin.manifest.version;
		this.renderStatus();
	}

	// Drive both indicators from one state. "dirty" = a watched file changed and
	// a reload is pending; "done" = a reload just fired (reverts to ready after).
	private setState(state: ReloadState): void {
		this.state = state;
		if (this.doneTimer !== null) {
			window.clearTimeout(this.doneTimer);
			this.doneTimer = null;
		}
		for (const el of [this.iconEl, this.statusEl]) {
			if (!el) continue;
			el.toggleClass("toolbox-reloader-dirty", state === "dirty");
			el.toggleClass("toolbox-reloader-done", state === "done");
		}
		this.renderStatus();
		if (state === "done") {
			this.doneTimer = window.setTimeout(() => this.setState("ready"), 2200);
		}
	}

	// Persistent status-bar text. Resting state shows the running version and the
	// load time, so a glance confirms both which build is live and that it just
	// reloaded, without having to catch a flash. The pending/just-reloaded states
	// show the action instead.
	private renderStatus(): void {
		if (!this.statusEl) return;
		let text: string;
		if (this.state === "dirty") {
			text = "↻ reload needed";
		} else if (this.state === "done") {
			text = "↻ reloaded ✓";
		} else {
			const ver = this.version ? `v${this.version}` : "loaded";
			text = `↻ ${ver} · ${this.loadedAt}`;
		}
		this.statusEl.setText(text);
	}

	start(): void {
		if (!this.ctx.settings.devPluginIds.length) return;
		this.watcher = new PluginReloadWatcher(
			this.ctx.app,
			this.ctx.settings,
			(id) => void this.onChange(id),
		);
		this.watcher.start();
	}

	stop(): void {
		this.watcher?.stop();
		this.watcher = null;
	}

	restart(): void {
		this.stop();
		this.start();
	}

	dispose(): void {
		this.stop();
		if (this.doneTimer !== null) {
			window.clearTimeout(this.doneTimer);
			this.doneTimer = null;
		}
		this.statusEl?.remove();
		this.statusEl = null;
		this.iconEl = null;
	}

	// Manual reload of one chosen plugin (the picker path).
	async reloadById(id: string): Promise<void> {
		const result = await reloadPlugin(this.ctx.app, id);
		this.notify(result);
		if (result.ok) this.setState("done");
	}

	// Manual reload of all configured dev plugins (the ribbon-click path).
	async reloadDevPlugins(): Promise<void> {
		const ids = this.ctx.settings.devPluginIds;
		if (!ids.length) {
			new Notice("No dev plugins configured. Add some in the settings tab.", 5000);
			return;
		}
		const ok: string[] = [];
		const failed: string[] = [];
		for (const id of ids) {
			const result = await reloadPlugin(this.ctx.app, id);
			if (result.ok) ok.push(reloadedLabel(result));
			else failed.push(result.name);
		}
		const parts: string[] = [];
		if (ok.length) parts.push(`Reloaded: ${ok.join(", ")}`);
		if (failed.length) parts.push(`Failed: ${failed.join(", ")}`);
		new Notice(parts.join(" | "), failed.length ? 8000 : 3000);
		if (ok.length) this.setState("done");
	}

	// A watched file changed. Auto-reload setting decides the outcome.
	private async onChange(id: string): Promise<void> {
		if (this.ctx.settings.autoWatch) {
			const result = await reloadPlugin(this.ctx.app, id);
			this.notify(result);
			if (result.ok) this.setState("done");
		} else {
			const name = this.ctx.app.plugins.manifests[id]?.name ?? id;
			this.diag(`${name} changed, needs reload.`);
			this.setState("dirty");
		}
	}

	private notify(result: ReloadResult): void {
		if (result.ok) this.diag(`Reloaded ${reloadedLabel(result)}.`);
		else this.diag(`Reload failed for ${result.name}: ${result.error}`, true);
	}

	private diag(message: string, force = false): void {
		if (force || this.ctx.settings.showDiagnostics) {
			new Notice(`Reloader: ${message}`, force ? 8000 : 3000);
		}
	}
}

// Single active instance: only one toolbox / one tool instance exists, and the
// module is re-evaluated fresh on plugin reload so no stale state survives.
let active: ReloaderController | null = null;

export function setActiveController(controller: ReloaderController): void {
	active = controller;
}

export function clearActiveController(controller: ReloaderController): void {
	if (active === controller) active = null;
}

export function restartActiveWatcher(): void {
	active?.restart();
}
