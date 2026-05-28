import Konva from "konva";
import type { Annotation, AnnotationKind, BasePalette } from "./types";
import { DEFAULT_PALETTE } from "./types";

function dataUrlToBlob(dataUrl: string): Blob {
	const commaIdx = dataUrl.indexOf(",");
	const header = dataUrl.slice(0, commaIdx);
	const data = dataUrl.slice(commaIdx + 1);
	const mimeMatch = header.match(/data:([^;]+)/);
	const mime = mimeMatch?.[1] ?? "image/png";
	const binary = atob(data);
	const len = binary.length;
	const buf = new Uint8Array(len);
	for (let i = 0; i < len; i++) buf[i] = binary.charCodeAt(i);
	return new Blob([buf], { type: mime });
}

export class AnnotationStage {
	stage: Konva.Stage;
	private bgLayer: Konva.Layer;
	private drawLayer: Konva.Layer;
	private annotations: Annotation[] = [];
	private redoStack: Annotation[] = [];
	private nodes = new Map<Annotation, Konva.Shape>();
	private currentTool: AnnotationKind = "pen";
	private palette: BasePalette = { ...DEFAULT_PALETTE };
	private drawing: { annotation: Annotation; startedAtPointer: { x: number; y: number } } | null = null;

	constructor(container: HTMLDivElement, image: HTMLImageElement) {
		const width = image.naturalWidth;
		const height = image.naturalHeight;
		this.stage = new Konva.Stage({
			container,
			width,
			height,
		});

		this.bgLayer = new Konva.Layer({ listening: false });
		this.drawLayer = new Konva.Layer();
		this.stage.add(this.bgLayer);
		this.stage.add(this.drawLayer);

		const konvaImage = new Konva.Image({
			image,
			x: 0,
			y: 0,
			width,
			height,
			listening: false,
		});
		this.bgLayer.add(konvaImage);

		this.fitToContainer(container);
		this.bindPointer();
	}

	getWidth(): number {
		return this.stage.width();
	}

	getHeight(): number {
		return this.stage.height();
	}

	fitToContainer(container: HTMLDivElement): void {
		const cw = container.clientWidth;
		if (cw <= 0) return;
		const scale = Math.min(1, cw / this.stage.width());
		this.stage.scale({ x: scale, y: scale });
		this.stage.width(this.stage.width() * scale);
		this.stage.height(this.stage.height() * scale);
		this.stage.batchDraw();
	}

	setTool(tool: AnnotationKind): void {
		this.currentTool = tool;
	}

	setPaletteColor(color: string): void {
		this.palette.color = color;
	}

	setStrokeWidth(width: number): void {
		this.palette.strokeWidth = width;
	}

	getPalette(): Readonly<BasePalette> {
		return this.palette;
	}

	getCurrentTool(): AnnotationKind {
		return this.currentTool;
	}

	undo(): void {
		const last = this.annotations.pop();
		if (!last) return;
		const node = this.nodes.get(last);
		if (node) {
			node.destroy();
			this.nodes.delete(last);
		}
		this.redoStack.push(last);
		this.drawLayer.batchDraw();
	}

	redo(): void {
		const next = this.redoStack.pop();
		if (!next) return;
		this.annotations.push(next);
		this.addNode(next);
		this.drawLayer.batchDraw();
	}

	clearAll(): void {
		for (const node of this.nodes.values()) node.destroy();
		this.nodes.clear();
		this.annotations = [];
		this.redoStack = [];
		this.drawLayer.batchDraw();
	}

	isEmpty(): boolean {
		return this.annotations.length === 0;
	}

	hasRedo(): boolean {
		return this.redoStack.length > 0;
	}

	canUndo(): boolean {
		return this.annotations.length > 0;
	}

	async toBlob(): Promise<Blob> {
		const dataUrl = this.stage.toDataURL({ pixelRatio: 1 / this.stage.scaleX(), mimeType: "image/png" });
		return dataUrlToBlob(dataUrl);
	}

	destroy(): void {
		this.stage.destroy();
	}

	private bindPointer(): void {
		this.stage.on("mousedown touchstart", (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
			(e.evt as Event).preventDefault();
			const point = this.getStagePointer();
			if (!point) return;
			this.startStroke(point);
		});
		this.stage.on("mousemove touchmove", (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
			if (!this.drawing) return;
			(e.evt as Event).preventDefault();
			const point = this.getStagePointer();
			if (!point) return;
			this.extendStroke(point);
		});
		const finish = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void => {
			if (!this.drawing) return;
			(e.evt as Event).preventDefault();
			this.finishStroke();
		};
		this.stage.on("mouseup touchend mouseleave", finish);
	}

	private getStagePointer(): { x: number; y: number } | null {
		const pointer = this.stage.getPointerPosition();
		if (!pointer) return null;
		const scale = this.stage.scaleX() || 1;
		return { x: pointer.x / scale, y: pointer.y / scale };
	}

	private startStroke(point: { x: number; y: number }): void {
		const tool = this.currentTool;
		let annotation: Annotation;
		switch (tool) {
			case "pen":
				annotation = { kind: "pen", points: [point.x, point.y], color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "box":
				annotation = { kind: "box", x: point.x, y: point.y, width: 0, height: 0, color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "arrow":
				annotation = { kind: "arrow", x1: point.x, y1: point.y, x2: point.x, y2: point.y, color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "blackout":
				annotation = { kind: "blackout", x: point.x, y: point.y, width: 0, height: 0 };
				break;
		}
		this.drawing = { annotation, startedAtPointer: point };
		this.addNode(annotation);
		this.redoStack = [];
	}

	private extendStroke(point: { x: number; y: number }): void {
		if (!this.drawing) return;
		const a = this.drawing.annotation;
		const start = this.drawing.startedAtPointer;
		switch (a.kind) {
			case "pen":
				a.points.push(point.x, point.y);
				break;
			case "box":
			case "blackout":
				a.x = Math.min(start.x, point.x);
				a.y = Math.min(start.y, point.y);
				a.width = Math.abs(point.x - start.x);
				a.height = Math.abs(point.y - start.y);
				break;
			case "arrow":
				a.x2 = point.x;
				a.y2 = point.y;
				break;
		}
		this.refreshNode(a);
	}

	private finishStroke(): void {
		if (!this.drawing) return;
		const a = this.drawing.annotation;
		this.drawing = null;
		const tooSmall =
			(a.kind === "box" || a.kind === "blackout") && a.width < 4 && a.height < 4;
		const tooShort = a.kind === "pen" && a.points.length < 4;
		const arrowSamePoint = a.kind === "arrow" && Math.hypot(a.x2 - a.x1, a.y2 - a.y1) < 4;
		if (tooSmall || tooShort || arrowSamePoint) {
			const node = this.nodes.get(a);
			if (node) node.destroy();
			this.nodes.delete(a);
			this.drawLayer.batchDraw();
			return;
		}
		this.annotations.push(a);
		this.drawLayer.batchDraw();
	}

	private addNode(a: Annotation): void {
		const node = this.buildNode(a);
		this.nodes.set(a, node);
		this.drawLayer.add(node);
		this.drawLayer.batchDraw();
	}

	private refreshNode(a: Annotation): void {
		const node = this.nodes.get(a);
		if (!node) return;
		this.applyToNode(a, node);
		this.drawLayer.batchDraw();
	}

	private buildNode(a: Annotation): Konva.Shape {
		switch (a.kind) {
			case "pen":
				return new Konva.Line({
					points: a.points,
					stroke: a.color,
					strokeWidth: a.strokeWidth,
					tension: 0.4,
					lineCap: "round",
					lineJoin: "round",
				});
			case "box":
				return new Konva.Rect({
					x: a.x,
					y: a.y,
					width: a.width,
					height: a.height,
					stroke: a.color,
					strokeWidth: a.strokeWidth,
				});
			case "arrow":
				return new Konva.Arrow({
					points: [a.x1, a.y1, a.x2, a.y2],
					stroke: a.color,
					fill: a.color,
					strokeWidth: a.strokeWidth,
					pointerLength: 10,
					pointerWidth: 10,
				});
			case "blackout":
				return new Konva.Rect({
					x: a.x,
					y: a.y,
					width: a.width,
					height: a.height,
					fill: "#000000",
				});
		}
	}

	private applyToNode(a: Annotation, node: Konva.Shape): void {
		switch (a.kind) {
			case "pen":
				(node as Konva.Line).points(a.points);
				break;
			case "box":
			case "blackout":
				node.position({ x: a.x, y: a.y });
				(node as Konva.Rect).width(a.width);
				(node as Konva.Rect).height(a.height);
				break;
			case "arrow":
				(node as Konva.Arrow).points([a.x1, a.y1, a.x2, a.y2]);
				break;
		}
	}
}
