import type { CountdownNoticeHandle } from "../types";

const NOTICE_CLASS = "toolbox-countdown-notice";

export function countdownNotice(
	seconds: number,
	onTick?: (remaining: number) => void,
): CountdownNoticeHandle {
	const doc = activeDocument;
	const el = doc.body.createDiv({ cls: NOTICE_CLASS });
	el.createSpan({ cls: "toolbox-countdown-notice-label", text: "Capturing in" });
	const counter = el.createSpan({ cls: "toolbox-countdown-notice-counter", text: String(seconds) });

	let remaining = seconds;
	let cancelled = false;
	let resolveOuter: () => void;
	let rejectOuter: (reason: unknown) => void;
	const promise = new Promise<void>((resolve, reject) => {
		resolveOuter = resolve;
		rejectOuter = reject;
	});

	const interval = window.setInterval(() => {
		if (cancelled) return;
		remaining -= 1;
		counter.setText(String(remaining));
		onTick?.(remaining);
		if (remaining <= 0) {
			window.clearInterval(interval);
			el.detach();
			resolveOuter();
		}
	}, 1000);

	return {
		promise,
		cancel(): void {
			if (cancelled) return;
			cancelled = true;
			window.clearInterval(interval);
			el.detach();
			rejectOuter(new Error("countdown cancelled"));
		},
	};
}

export { NOTICE_CLASS as COUNTDOWN_NOTICE_CLASS };
