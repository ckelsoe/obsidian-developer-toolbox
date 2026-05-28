import { FuzzySuggestModal, type App, type PluginManifest } from "obsidian";

// Lists installed plugins by display name (id shown as subtext via getItemText)
// and returns the id to the caller. The user never types a plugin id by hand.
export class PluginPickerModal extends FuzzySuggestModal<PluginManifest> {
	constructor(
		app: App,
		private onChoose: (id: string) => void,
		placeholder = "Select a plugin",
	) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getItems(): PluginManifest[] {
		const manifests = this.app.plugins.manifests;
		const list: PluginManifest[] = [];
		for (const id of Object.keys(manifests)) {
			const manifest = manifests[id];
			if (manifest) list.push(manifest);
		}
		return list.sort((a, b) => a.name.localeCompare(b.name));
	}

	getItemText(manifest: PluginManifest): string {
		return `${manifest.name} (${manifest.id})`;
	}

	onChooseItem(manifest: PluginManifest): void {
		this.onChoose(manifest.id);
	}
}
