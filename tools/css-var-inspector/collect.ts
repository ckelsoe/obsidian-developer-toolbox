import type { CssVar } from "./types";

// DOM/CSSOM collection. Obsidian exposes no variable-enumeration API, so this is
// standard CSSOM: scan every readable stylesheet for custom-property names, then
// resolve each to its current value via getComputedStyle. Kept out of a unit test
// because it is DOM-dependent; the pure formatting lives in format.ts.
//
// Two passes are required because getComputedStyle can RESOLVE a property name but
// cannot ENUMERATE which custom properties exist. Pass 1 gathers the names from
// the rule text; pass 2 resolves the active value for each.
export function collectCssVars(doc: Document): CssVar[] {
	const names = new Set<string>();

	for (const sheet of Array.from(doc.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			// Cross-origin sheets throw a SecurityError on cssRules access. Skip
			// the sheet rather than aborting the whole scan. On desktop, app.css is
			// served same-origin (app://) and is readable.
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSStyleRule)) continue;
			const style = rule.style;
			for (let i = 0; i < style.length; i++) {
				const prop = style.item(i);
				if (prop.startsWith("--")) names.add(prop);
			}
		}
	}

	// Resolve on body: Obsidian sets variables on body and on .theme-dark /
	// .theme-light (the scheme class lives on body), so the body-scoped computed
	// value is the effective one for the active light/dark scheme.
	const win = doc.defaultView;
	const computed = win ? win.getComputedStyle(doc.body) : null;

	const out: CssVar[] = [];
	for (const name of names) {
		const value = computed ? computed.getPropertyValue(name).trim() : "";
		out.push({ name, value });
	}
	return out.sort((a, b) => a.name.localeCompare(b.name));
}
