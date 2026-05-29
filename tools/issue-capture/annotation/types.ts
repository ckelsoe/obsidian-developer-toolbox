// A drawable annotation kind. "select" is a tool MODE, not a drawable kind, so
// it lives in ToolMode below rather than here.
export type AnnotationKind = "pen" | "box" | "arrow" | "blackout" | "text" | "highlight";

// What the toolbar can put the stage into. Every AnnotationKind plus the
// non-drawing "select" mode that drives move/resize/rotate.
export type ToolMode = AnnotationKind | "select";

export const STROKE_WIDTHS: readonly { id: "thin" | "medium" | "thick"; px: number; label: string }[] = [
	{ id: "thin", px: 2, label: "Thin" },
	{ id: "medium", px: 4, label: "Medium" },
	{ id: "thick", px: 7, label: "Thick" },
];

export interface BasePalette {
	color: string;
	strokeWidth: number;
}

export interface PenAnnotation {
	kind: "pen";
	points: number[];
	color: string;
	strokeWidth: number;
}

export interface BoxAnnotation {
	kind: "box";
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	strokeWidth: number;
	// Degrees, baked from the Transformer on resize/rotate. Defaults to 0.
	rotation?: number;
}

export interface ArrowAnnotation {
	kind: "arrow";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color: string;
	strokeWidth: number;
}

export interface BlackoutAnnotation {
	kind: "blackout";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation?: number;
}

export interface HighlightAnnotation {
	kind: "highlight";
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	rotation?: number;
}

export interface TextAnnotation {
	kind: "text";
	x: number;
	y: number;
	text: string;
	color: string;
	fontSize: number;
	rotation?: number;
}

export type Annotation =
	| PenAnnotation
	| BoxAnnotation
	| ArrowAnnotation
	| BlackoutAnnotation
	| HighlightAnnotation
	| TextAnnotation;

// Anything drawn by dragging the pointer (everything except text, which is
// placed by a click + typed editor). Used as the working type while a stroke
// is in progress.
export type DraggedAnnotation = Exclude<Annotation, TextAnnotation>;

// The flat, JSON-safe shape persisted for D3 draft restore. Annotations are
// already plain data, so the array serializes directly; width/height pin the
// natural image dimensions so a restored draft rebuilds at the right scale.
export interface SerializedAnnotations {
	width: number;
	height: number;
	annotations: Annotation[];
}

export const PALETTE: readonly string[] = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#000000"];

export const DEFAULT_PALETTE: BasePalette = {
	color: "#ef4444",
	strokeWidth: 4,
};

export const DEFAULT_TEXT_FONT_SIZE = 20;

// Highlight fill is drawn at this alpha with a "multiply" blend so overlapping
// strokes read like a marker rather than stacked opaque blocks.
export const HIGHLIGHT_OPACITY = 0.4;

// Pen/arrow lines are thin; widen the invisible hit region so select mode can
// actually grab them without pixel-perfect aim.
export const MIN_HIT_STROKE_WIDTH = 12;
