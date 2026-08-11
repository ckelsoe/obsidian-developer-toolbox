import { trimTrailingChars } from './text-trim';

function getHomeDir(): string {
	const env = process.env ?? {};
	return env.USERPROFILE ?? env.HOME ?? '';
}

const HOME = getHomeDir();

export function redactHome(p: string): string {
	if (!p) return p;
	if (!HOME) return p;
	const normalised = p.replace(/\\/g, '/');
	const home = HOME.replace(/\\/g, '/');
	if (normalised.toLowerCase().startsWith(home.toLowerCase())) {
		return '~' + normalised.slice(home.length);
	}
	return p;
}

export function redactVault(p: string, vaultBase: string): string {
	if (!p || !vaultBase) return p;
	const normalised = p.replace(/\\/g, '/');
	const base = trimTrailingChars(vaultBase.replace(/\\/g, '/'), '/');
	const lowerBase = base.toLowerCase();
	// Exact-vault match first, comparing both sides trailing-slash-trimmed, so a
	// path equal to the vault (including a filesystem-root base like `/` or `C:/`)
	// redacts to `<vault>`, not `<vault>/`.
	if (trimTrailingChars(normalised, '/').toLowerCase() === lowerBase) {
		return '<vault>';
	}
	const prefix = base ? `${lowerBase}/` : '/';
	if (normalised.toLowerCase().startsWith(prefix)) {
		return '<vault>/' + normalised.slice(base.length + 1);
	}
	return p;
}

export function isAbsolute(p: string): boolean {
	if (!p) return false;
	return /^([a-zA-Z]:[\\/])|^[\\/]/.test(p);
}
