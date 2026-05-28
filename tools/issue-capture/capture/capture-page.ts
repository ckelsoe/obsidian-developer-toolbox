// Primary capture path. Verified by the 2026-05-28 spike: Obsidian 1.12.7 /
// Electron 39.8.3 / Windows 11. 150-230 ms, pixel-perfect, captures DOM +
// native window chrome + every transient UI exercised.

interface NativeImageLike {
	toPNG(): Uint8Array | Buffer;
	getSize(): { width: number; height: number };
}

interface WebContentsLike {
	capturePage(): Promise<NativeImageLike>;
}

interface ElectronRemoteLike {
	getCurrentWebContents?: () => WebContentsLike | undefined;
}

interface ElectronLike {
	remote?: ElectronRemoteLike;
}

function requireElectron(): ElectronLike | null {
	const req = (window as { require?: (id: string) => unknown }).require;
	if (typeof req !== "function") return null;
	try {
		return req("electron") as ElectronLike;
	} catch {
		return null;
	}
}

export function isCapturePageAvailable(): boolean {
	const electron = requireElectron();
	const wc = electron?.remote?.getCurrentWebContents?.();
	return typeof wc?.capturePage === "function";
}

export async function captureViaCapturePage(): Promise<{ blob: Blob; widthPx: number; heightPx: number }> {
	const electron = requireElectron();
	const wc = electron?.remote?.getCurrentWebContents?.();
	if (!wc?.capturePage) {
		throw new Error("webContents.capturePage is not available");
	}
	const image = await wc.capturePage();
	const buf = image.toPNG();
	const size = image.getSize();
	// Convert to a real ArrayBuffer-backed Uint8Array so Blob receives a tight view.
	const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	const ab = new ArrayBuffer(u8.byteLength);
	new Uint8Array(ab).set(u8);
	const blob = new Blob([ab], { type: "image/png" });
	return { blob, widthPx: size.width, heightPx: size.height };
}
