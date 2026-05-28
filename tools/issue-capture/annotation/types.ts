export type AnnotationKind = "pen" | "box" | "arrow" | "blackout" | "text";

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
}

export interface TextAnnotation {
	kind: "text";
	x: number;
	y: number;
	text: string;
	color: string;
	fontSize: number;
}

export type Annotation = PenAnnotation | BoxAnnotation | ArrowAnnotation | BlackoutAnnotation | TextAnnotation;

export const PALETTE: readonly string[] = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#000000"];

export const DEFAULT_PALETTE: BasePalette = {
	color: "#ef4444",
	strokeWidth: 4,
};

export const DEFAULT_TEXT_FONT_SIZE = 20;
