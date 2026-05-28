import type { ToolboxLib } from "../../../lib/types";
import { COUNTDOWN_NOTICE_CLASS } from "../../../lib/ui/notice";

const HIDDEN_CLASS = "toolbox-hidden";

export async function awaitCountdown(seconds: number, lib: ToolboxLib): Promise<void> {
	if (seconds <= 0) return;
	const handle = lib.ui.countdownNotice(seconds);
	await handle.promise;
}

export function hideCountdownElements(): HTMLElement[] {
	const hidden: HTMLElement[] = [];
	const nodes = activeDocument.querySelectorAll<HTMLElement>("." + COUNTDOWN_NOTICE_CLASS);
	nodes.forEach((node) => {
		hidden.push(node);
		node.addClass(HIDDEN_CLASS);
	});
	return hidden;
}

export function hideElement(el: HTMLElement): void {
	el.addClass(HIDDEN_CLASS);
}

export function restoreElements(elements: HTMLElement[]): void {
	for (const el of elements) {
		el.removeClass(HIDDEN_CLASS);
	}
}
