export interface CssVarInspectorSettings {
	enabled: boolean;
}

export const DEFAULT_CSS_VAR_INSPECTOR_SETTINGS: CssVarInspectorSettings = {
	enabled: true,
};

// One CSS custom property with its current computed value. Defined here (not in
// collect.ts) so the pure format module can import the type without pulling in
// any DOM dependency.
export interface CssVar {
	name: string;
	value: string;
}
