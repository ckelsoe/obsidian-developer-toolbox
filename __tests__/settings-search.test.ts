// Obsidian's settings search finds a setting by its name, description and
// aliases. A section drawn by hand has none of those unless it is given them,
// so every one of them except the footer must carry a name and be searchable.
// The footer itself must carry the standard version and link row.

import type { App, PluginManifest, Setting } from 'obsidian';
import DeveloperToolboxPlugin from '../main';
import { ToolboxSettingTab } from '../settings';

// The obsidian package ships no runtime code. Every value the plugin imports
// from it becomes an empty class, enough to load the modules and build the
// definitions without a host app.
vi.mock(
	'obsidian',
	() =>
		new Proxy(
			{},
			{
				has: () => true,
				get: (_target, key) => (key === 'then' ? undefined : class {}),
			},
		),
);

interface Item {
	type?: string;
	name?: string;
	desc?: unknown;
	aliases?: unknown;
	searchable?: boolean;
	visible?: () => boolean;
	render?: (setting: Setting) => void;
	items?: Item[];
}

function leaves(items: Item[]): Item[] {
	return items.flatMap((i) => (i.items ? leaves(i.items) : [i]));
}

// Just enough of Obsidian's HTMLElement helpers to record what the footer draws.
interface FakeEl {
	tag: string;
	cls: string[];
	text: string;
	href?: string;
	attr?: Record<string, string>;
	children: FakeEl[];
	empty(): void;
	addClass(cls: string): void;
	setText(text: string): void;
	createDiv(o?: { cls?: string; text?: string }): FakeEl;
	createSpan(o?: { cls?: string; text?: string }): FakeEl;
	createEl(
		tag: string,
		o?: {
			cls?: string;
			text?: string;
			href?: string;
			attr?: Record<string, string>;
		},
	): FakeEl;
}

function fakeEl(tag = 'div'): FakeEl {
	const el: FakeEl = {
		tag,
		cls: [],
		text: '',
		children: [],
		empty: () => {
			el.children = [];
		},
		addClass: (cls) => {
			el.cls.push(cls);
		},
		setText: (text) => {
			el.text = text;
		},
		createDiv: (o) => el.createEl('div', o),
		createSpan: (o) => el.createEl('span', o),
		createEl: (childTag, o = {}) => {
			const child = fakeEl(childTag);
			if (o.cls) child.cls.push(o.cls);
			child.text = o.text ?? '';
			child.href = o.href;
			child.attr = o.attr;
			el.children.push(child);
			return child;
		},
	};
	return el;
}

function walk(el: FakeEl): FakeEl[] {
	return [el, ...el.children.flatMap(walk)];
}

function setup() {
	const plugin = new DeveloperToolboxPlugin({} as App, {} as PluginManifest);
	plugin.manifest = {
		id: 'developer-toolbox',
		version: '9.8.7',
	} as PluginManifest;
	plugin.data = { version: 3, storageRoot: '_dev-tools', tools: {} };
	const tab = new ToolboxSettingTab({} as App, plugin);
	// The on-disk version lookup finds no manifest folder and keeps the
	// in-memory version.
	tab.app = { plugins: { manifests: {} } } as unknown as App;
	const items = leaves(tab.getSettingDefinitions() as unknown as Item[]);
	return { plugin, items };
}

describe('settings search', () => {
	it('gives every hand-drawn section a name and makes it searchable, except the footer', () => {
		const { items } = setup();
		const custom = items.filter((i) => i.render !== undefined && !i.type);
		// Obsidian treats an absent `searchable` as true.
		const hidden = custom.filter((i) => i.searchable === false);
		expect(hidden.map((i) => i.name)).toEqual(['About']);
		for (const i of custom.filter((c) => c.searchable !== false)) {
			// toMatch fails on a missing name as well as an empty one.
			expect(i.name).toMatch(/\S/);
			expect(typeof i.desc).toBe('string');
			expect(Array.isArray(i.aliases)).toBe(true);
		}
	});

	it('gives every tool that draws its own settings a search entry', () => {
		const { plugin, items } = setup();
		const drawing = plugin.tools.filter((t) => t.renderSettings);
		expect(drawing.length).toBeGreaterThan(0);
		for (const tool of drawing) {
			const search = tool.settingsSearch;
			expect(search, tool.id).toBeDefined();
			expect(items.map((i) => i.name)).toContain(search?.name);
		}
	});

	it('hides a tool body while the tool is off', () => {
		const { plugin, items } = setup();
		const body = items.find((i) => i.name === 'Capture and privacy');
		expect(body?.visible).toBeTypeOf('function');
		plugin.data.tools['issue-capture'] = { enabled: false };
		expect(body?.visible?.()).toBe(false);
		plugin.data.tools['issue-capture'] = { enabled: true };
		expect(body?.visible?.()).toBe(true);
	});
});

describe('settings footer', () => {
	it('reads Version | GitHub | Discord | Report issues, each link in a new tab', () => {
		const { items } = setup();
		const footer = items.find((i) => i.name === 'About');
		const settingEl = fakeEl();
		footer?.render?.({ settingEl } as unknown as Setting);

		expect(settingEl.cls).toContain('developer-toolbox-settings-footer');
		const all = walk(settingEl);
		expect(all.some((e) => e.text === 'Version 9.8.7')).toBe(true);
		const links = all.filter((e) => e.tag === 'a');
		expect(links.map((a) => [a.text, a.href])).toEqual([
			['GitHub', 'https://github.com/ckelsoe/obsidian-developer-toolbox'],
			['Discord', 'https://discord.gg/gd6tKJDPj4'],
			[
				'Report issues',
				'https://github.com/ckelsoe/obsidian-developer-toolbox/issues',
			],
		]);
		for (const a of links)
			expect(a.attr).toEqual({ target: '_blank', rel: 'noopener' });
		// Each separator sits in one nowrap item with the link after it.
		const groups = all.filter((e) =>
			e.cls.includes('developer-toolbox-footer-link'),
		);
		expect(groups.map((g) => g.children.map((c) => c.text))).toEqual([
			['|', 'GitHub'],
			['|', 'Discord'],
			['|', 'Report issues'],
		]);
	});
});
