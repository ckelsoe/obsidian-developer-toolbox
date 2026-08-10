/**
 * Linear, unbounded trailing-character trim, used in place of a `/x+$/`
 * `String.replace`. eslint-plugin-sonarjs flags such regexes as super-linear
 * (quadratic backtracking on a long non-matching run); a bounded quantifier
 * silences it but silently stops stripping past the bound. A plain scan is
 * linear and strips every matching character.
 */
export function trimTrailingChars(value: string, chars: string): string {
	let end = value.length;
	while (end > 0 && chars.includes(value.charAt(end - 1))) end--;
	return value.slice(0, end);
}
