export async function writeText(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}
