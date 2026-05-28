function getHomeDir(): string {
	const env = process.env ?? {};
	return env.USERPROFILE ?? env.HOME ?? "";
}

const HOME = getHomeDir();

export function redactHome(p: string): string {
	if (!p) return p;
	if (!HOME) return p;
	const normalised = p.replace(/\\/g, "/");
	const home = HOME.replace(/\\/g, "/");
	if (normalised.toLowerCase().startsWith(home.toLowerCase())) {
		return "~" + normalised.slice(home.length);
	}
	return p;
}

export function redactVault(p: string, vaultBase: string): string {
	if (!p || !vaultBase) return p;
	const normalised = p.replace(/\\/g, "/");
	const base = vaultBase.replace(/\\/g, "/").replace(/\/+$/, "");
	if (normalised.toLowerCase().startsWith(base.toLowerCase() + "/")) {
		return "<vault>/" + normalised.slice(base.length + 1);
	}
	if (normalised.toLowerCase() === base.toLowerCase()) {
		return "<vault>";
	}
	return p;
}

export function isAbsolute(p: string): boolean {
	if (!p) return false;
	return /^([a-zA-Z]:[\\/])|^[\\/]/.test(p);
}
