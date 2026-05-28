// Fallback capture path. Used automatically when capture-page.ts is unavailable
// (future Obsidian Electron upgrade removes `electron.remote`) or the primary
// path rejects. Spike-verified 2026-05-28: 700-950 ms, pixel quality identical.

interface DesktopCapturerSourceLike {
	id: string;
	name: string;
}

interface DesktopCapturerLike {
	getSources(opts: { types: string[] }): Promise<DesktopCapturerSourceLike[]>;
}

interface ElectronRemoteLike {
	desktopCapturer?: DesktopCapturerLike;
}

interface ElectronLike {
	desktopCapturer?: DesktopCapturerLike;
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

function getDesktopCapturer(): DesktopCapturerLike | null {
	const electron = requireElectron();
	return electron?.desktopCapturer ?? electron?.remote?.desktopCapturer ?? null;
}

export function isFallbackAvailable(): boolean {
	return getDesktopCapturer() !== null;
}

async function streamToBlob(stream: MediaStream): Promise<{ blob: Blob; widthPx: number; heightPx: number }> {
	const doc = activeDocument;
	const video = doc.createElement("video");
	video.srcObject = stream;
	video.muted = true;
	await video.play();
	await new Promise<void>((resolve) => {
		if (video.readyState >= 2) resolve();
		else video.onloadeddata = (): void => resolve();
	});
	const canvas = doc.createElement("canvas");
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		stream.getTracks().forEach((t) => t.stop());
		throw new Error("failed to obtain 2d canvas context");
	}
	ctx.drawImage(video, 0, 0);
	stream.getTracks().forEach((t) => t.stop());
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("canvas.toBlob returned null");
	return { blob, widthPx: canvas.width, heightPx: canvas.height };
}

export async function captureViaFallback(): Promise<{ blob: Blob; widthPx: number; heightPx: number }> {
	const dc = getDesktopCapturer();
	if (!dc) throw new Error("desktopCapturer is not available");
	const sources = await dc.getSources({ types: ["window"] });
	const obsSrc = sources.find((s) => /Obsidian/i.test(s.name)) ?? sources[0];
	if (!obsSrc) throw new Error("no Obsidian window source returned by desktopCapturer");
	const stream = await (
		navigator.mediaDevices as unknown as { getUserMedia: (constraints: object) => Promise<MediaStream> }
	).getUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: "desktop",
				chromeMediaSourceId: obsSrc.id,
				minWidth: 320,
				maxWidth: 8000,
				minHeight: 240,
				maxHeight: 8000,
			},
		},
	});
	return await streamToBlob(stream);
}
