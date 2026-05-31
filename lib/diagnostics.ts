import type { DiagnosticsBus, DiagnosticsEntry } from "./types";

// Normalize the optional body into the stored markdown. undefined drops to null,
// a string passes through verbatim, an object becomes a fenced JSON block.
export function formatBody(body: string | Record<string, unknown> | undefined): string | null {
	if (body === undefined) return null;
	if (typeof body === "string") return body;
	return "```json\n" + JSON.stringify(body, null, 2) + "\n```";
}

// Render an error defensively. Real Error objects use name + message + stack;
// anything else falls back to String(). Wrapped in a plain code fence.
export function formatError(error: unknown): string {
	let text: string;
	if (error instanceof Error) {
		const head = `${error.name}: ${error.message}`;
		text = error.stack ? `${head}\n${error.stack}` : head;
	} else {
		text = String(error);
	}
	return "```\n" + text + "\n```";
}

// Singleton bus built once at onload. It closes over a single sink reference.
// append() stamps an ISO timestamp at call time and forwards the entry to the
// sink if one is attached; with no sink the entry is dropped on the floor.
export function buildDiagnosticsBus(): DiagnosticsBus {
	let sink: ((entry: DiagnosticsEntry) => void) | null = null;

	const append: DiagnosticsBus["append"] = (label, opts = {}) => {
		const entry: DiagnosticsEntry = {
			label,
			status: opts.status ?? "ok",
			elapsedMs: opts.elapsedMs ?? null,
			timestamp: new Date().toISOString(),
			body: formatBody(opts.body),
		};
		if (sink) sink(entry);
	};

	return {
		append,
		appendError: (label, error, opts = {}): void => {
			append(label, { status: "error", elapsedMs: opts.elapsedMs, body: formatError(error) });
		},
		attachSink: (next): (() => void) => {
			sink = next;
			return (): void => {
				if (sink === next) sink = null;
			};
		},
		hasSink: (): boolean => sink !== null,
	};
}
