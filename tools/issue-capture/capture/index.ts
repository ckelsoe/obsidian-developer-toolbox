import type { ToolboxLib } from "../../../lib/types";
import { captureViaCapturePage, isCapturePageAvailable } from "./capture-page";
import { captureViaFallback, isFallbackAvailable } from "./fallback";
import { awaitCountdown, hideCountdownElements, hideElement, restoreElements } from "./countdown";

export interface CapturedImage {
	pngBlob: Blob;
	widthPx: number;
	heightPx: number;
	capturedAt: number;
	path: "capturePage" | "fallback";
}

export interface CaptureOpts {
	delayMs?: number;
	hideElements?: HTMLElement[];
}

async function nextFrame(): Promise<void> {
	await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export async function capture(opts: CaptureOpts, lib: ToolboxLib): Promise<CapturedImage> {
	const delaySec = opts.delayMs ? Math.max(0, Math.round(opts.delayMs / 1000)) : 0;
	if (delaySec > 0) {
		await awaitCountdown(delaySec, lib);
	}

	const userHidden: HTMLElement[] = [];
	for (const el of opts.hideElements ?? []) {
		userHidden.push(el);
		hideElement(el);
	}
	const noticeHidden = hideCountdownElements();
	await nextFrame();

	const restore = (): void => {
		restoreElements(noticeHidden);
		restoreElements(userHidden);
	};

	try {
		if (isCapturePageAvailable()) {
			try {
				const result = await captureViaCapturePage();
				return {
					pngBlob: result.blob,
					widthPx: result.widthPx,
					heightPx: result.heightPx,
					capturedAt: Date.now(),
					path: "capturePage",
				};
			} catch (primaryErr) {
				console.warn("[developer-toolbox] capturePage failed, falling back", primaryErr);
				if (!isFallbackAvailable()) {
					throw primaryErr;
				}
			}
		}

		if (!isFallbackAvailable()) {
			throw new Error("No capture path is available in this Obsidian build.");
		}

		const result = await captureViaFallback();
		return {
			pngBlob: result.blob,
			widthPx: result.widthPx,
			heightPx: result.heightPx,
			capturedAt: Date.now(),
			path: "fallback",
		};
	} finally {
		restore();
	}
}
