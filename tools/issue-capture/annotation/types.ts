export type AnnotationKind = "pen" | "box" | "arrow" | "blackout";

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

export type Annotation = PenAnnotation | BoxAnnotation | ArrowAnnotation | BlackoutAnnotation;

export const PALETTE: readonly string[] = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#000000"];

export const DEFAULT_PALETTE: BasePalette = {
	color: "#ef4444",
	strokeWidth: 3,
};
