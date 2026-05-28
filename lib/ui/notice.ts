import { Notice } from "obsidian";
import type { CountdownNoticeHandle } from "../types";

const NOTICE_CLASS = "toolbox-countdown-notice";

export function countdownNotice(
	seconds: number,
	onTick?: (remaining: number) => void,
): CountdownNoticeHandle {
	const initial = Math.max(1, Math.round(seconds));
	const notice = new Notice(buildMessage(initial), (initial + 1) * 1000);

	let remaining = initial;
	let cancelled = false;
	let resolveOuter: () => void = () => undefined;
	let rejectOuter: (reason: unknown) => void = () => undefined;
	const promise = new Promise<void>((resolve, reject) => {
		resolveOuter = resolve;
		rejectOuter = reject;
	});

	const interval = window.setInterval(() => {
		if (cancelled) return;
		remaining -= 1;
		onTick?.(remaining);
		if (remaining <= 0) {
			window.clearInterval(interval);
			notice.hide();
			resolveOuter();
			return;
		}
		notice.setMessage(buildMessage(remaining));
	}, 1000);

	return {
		promise,
		cancel(): void {
			if (cancelled) return;
			cancelled = true;
			window.clearInterval(interval);
			notice.hide();
			rejectOuter(new Error("countdown cancelled"));
		},
	};
}

function buildMessage(remaining: number): string {
	return `Capturing in ${remaining}…`;
}

export { NOTICE_CLASS as COUNTDOWN_NOTICE_CLASS };
