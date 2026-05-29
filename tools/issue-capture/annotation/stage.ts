import Konva from "konva";
import type { Annotation, BasePalette, DraggedAnnotation, SerializedAnnotations, TextAnnotation, ToolMode } from "./types";
import { DEFAULT_PALETTE, DEFAULT_TEXT_FONT_SIZE, HIGHLIGHT_OPACITY, MIN_HIT_STROKE_WIDTH } from "./types";
import { mapPointsThroughTransform } from "./geometry";

export function dataUrlToBlob(dataUrl: string): Blob {
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

type AnnotationNode = Konva.Shape | Konva.Text;

export class AnnotationStage {
	stage: Konva.Stage;
	private container: HTMLDivElement;
	private bgLayer: Konva.Layer;
	private drawLayer: Konva.Layer;
	private annotations: Annotation[] = [];
	private redoStack: Annotation[] = [];
	private nodes = new Map<Annotation, AnnotationNode>();
	private nodeToAnnotation = new Map<AnnotationNode, Annotation>();
	private mode: ToolMode = "pen";
	private palette: BasePalette = { ...DEFAULT_PALETTE };
	private drawing: { annotation: DraggedAnnotation; startedAtPointer: { x: number; y: number } } | null = null;
	private textEditor: HTMLTextAreaElement | null = null;
	private editingText: TextAnnotation | null = null;
	private transformer: Konva.Transformer;
	private selection: Annotation[] = [];
	private selectionListeners: (() => void)[] = [];
	// Active manual group move: the pointer position where the move began plus
	// each selected node's start position. Move is delta-based (current pointer
	// minus start pointer), never absolute, so nothing can snap to the cursor.
	private moveDrag: { startPointer: { x: number; y: number }; starts: Map<Annotation, { x: number; y: number }> } | null = null;
	// Blackouts are redactions: locked by default so they cannot be selected,
	// moved, resized, or deleted by accident. The user must opt in to unlock.
	private blackoutsUnlocked = false;

	constructor(container: HTMLDivElement, image: HTMLImageElement, restore?: SerializedAnnotations) {
		this.container = container;
		const width = restore?.width || image.naturalWidth;
		const height = restore?.height || image.naturalHeight;
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

		this.transformer = new Konva.Transformer({
			rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
			rotateAnchorOffset: 24,
			ignoreStroke: true,
			borderStroke: "#3b82f6",
			anchorStroke: "#3b82f6",
			anchorFill: "#ffffff",
		});
		this.transformer.on("transformend", () => this.bakeSelection());
		this.drawLayer.add(this.transformer);

		if (restore) this.restoreAnnotations(restore.annotations);

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

	setTool(mode: ToolMode): void {
		this.commitTextEditor();
		this.mode = mode;
		if (mode !== "select") this.deselect();
		this.moveDrag = null;
		this.container.toggleClass("is-select-mode", mode === "select");
		this.drawLayer.batchDraw();
	}

	setPaletteColor(color: string): void {
		this.palette.color = color;
		this.applyColorToSelection(color);
	}

	setStrokeWidth(width: number): void {
		this.palette.strokeWidth = width;
		this.applyStrokeWidthToSelection(width);
	}

	getPalette(): Readonly<BasePalette> {
		return this.palette;
	}

	getCurrentTool(): ToolMode {
		return this.mode;
	}

	hasSelection(): boolean {
		return this.selection.length > 0;
	}

	isBlackoutsUnlocked(): boolean {
		return this.blackoutsUnlocked;
	}

	setBlackoutsUnlocked(value: boolean): void {
		this.blackoutsUnlocked = value;
		if (!value && this.selection.some((a) => a.kind === "blackout")) {
			// Re-locking drops any selected blackout so it cannot keep being moved.
			this.setSelection(this.selection.filter((a) => a.kind !== "blackout"));
		}
	}

	// Lets the modal toolbar light up / grey out the delete button as selection
	// changes without polling.
	onSelectionChange(cb: () => void): void {
		this.selectionListeners.push(cb);
	}

	undo(): void {
		const last = this.annotations.pop();
		if (!last) return;
		this.removeNode(last);
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
		this.commitTextEditor();
		this.deselect();
		for (const a of [...this.annotations]) this.removeNode(a);
		this.annotations = [];
		this.redoStack = [];
		this.drawLayer.batchDraw();
	}

	deleteSelected(): void {
		if (this.selection.length === 0) return;
		for (const a of this.selection) {
			const idx = this.annotations.indexOf(a);
			if (idx >= 0) this.annotations.splice(idx, 1);
			this.removeNode(a);
		}
		// Deleted annotations cannot be redone (redo only replays creations), so
		// drop the redo stack to avoid a stale resurrect.
		this.redoStack = [];
		this.setSelection([]);
		this.drawLayer.batchDraw();
	}

	isEmpty(): boolean {
		return this.annotations.length === 0;
	}

	canUndo(): boolean {
		return this.annotations.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	// D3: flat, JSON-safe snapshot of the editable model in natural image coords.
	serialize(): SerializedAnnotations {
		this.commitTextEditor();
		const scale = this.stage.scaleX() || 1;
		return {
			width: this.stage.width() / scale,
			height: this.stage.height() / scale,
			annotations: structuredClone(this.annotations),
		};
	}

	async toBlob(): Promise<Blob> {
		this.commitTextEditor();
		this.deselect();
		const dataUrl = this.stage.toDataURL({ pixelRatio: 1 / this.stage.scaleX(), mimeType: "image/png" });
		return dataUrlToBlob(dataUrl);
	}

	destroy(): void {
		this.commitTextEditor();
		this.stage.destroy();
	}

	private restoreAnnotations(annotations: Annotation[]): void {
		for (const a of annotations) {
			this.annotations.push(a);
			this.addNode(a);
		}
	}

	private bindPointer(): void {
		this.stage.on("mousedown touchstart", (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
			if (this.mode === "select") {
				this.handleSelectPointerDown(e);
				return;
			}
			(e.evt as Event).preventDefault();
			if (this.textEditor) {
				this.commitTextEditor();
				return;
			}
			const point = this.getStagePointer();
			if (!point) return;
			if (this.mode === "text") {
				this.openTextEditor(point);
				return;
			}
			this.startStroke(point);
		});
		this.stage.on("mousemove touchmove", (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
			if (this.mode === "select") {
				if (this.moveDrag) {
					(e.evt as Event).preventDefault();
					this.updateMove();
				}
				return;
			}
			if (!this.drawing) return;
			(e.evt as Event).preventDefault();
			const point = this.getStagePointer();
			if (!point) return;
			this.extendStroke(point);
		});
		const finish = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void => {
			if (this.mode === "select") {
				if (this.moveDrag) {
					(e.evt as Event).preventDefault();
					this.endMove();
				}
				return;
			}
			if (!this.drawing) return;
			(e.evt as Event).preventDefault();
			this.finishStroke();
		};
		this.stage.on("mouseup touchend mouseleave", finish);

		// D2: double-click a committed text object to re-edit it in place.
		this.stage.on("dblclick dbltap", (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
			const annotation = this.nodeToAnnotation.get(e.target as AnnotationNode);
			if (annotation?.kind === "text") {
				this.beginEditExistingText(annotation, e.target as Konva.Text);
			}
		});
	}

	// Select-mode pointer down: clears on empty canvas, toggles on shift/ctrl/
	// meta, otherwise selects (if needed) and starts a manual move. Pointer down
	// on a Transformer anchor is ignored so resize/rotate is left to the
	// Transformer.
	private handleSelectPointerDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
		const target = e.target;
		if (target.getParent() === this.transformer) return;
		if (target === this.stage) {
			this.setSelection([]);
			return;
		}
		const annotation = this.nodeToAnnotation.get(target as AnnotationNode);
		if (!annotation) return;
		// A locked blackout is not selectable: a click on it neither selects nor
		// moves it, and leaves the current selection alone.
		if (annotation.kind === "blackout" && !this.blackoutsUnlocked) return;
		(e.evt as Event).preventDefault();
		const evt = e.evt as MouseEvent;
		const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
		if (additive) {
			this.toggleInSelection(annotation, true);
			return;
		}
		if (!this.selection.includes(annotation)) this.setSelection([annotation]);
		this.beginMove();
	}

	private beginMove(): void {
		const p = this.getStagePointer();
		if (!p) return;
		const starts = new Map<Annotation, { x: number; y: number }>();
		for (const sel of this.selection) {
			const n = this.nodes.get(sel);
			if (n) starts.set(sel, { x: n.x(), y: n.y() });
		}
		this.moveDrag = { startPointer: p, starts };
	}

	private updateMove(): void {
		if (!this.moveDrag) return;
		const p = this.getStagePointer();
		if (!p) return;
		const dx = p.x - this.moveDrag.startPointer.x;
		const dy = p.y - this.moveDrag.startPointer.y;
		for (const [sel, start] of this.moveDrag.starts) {
			const n = this.nodes.get(sel);
			if (n) n.position({ x: start.x + dx, y: start.y + dy });
		}
		this.transformer.forceUpdate();
		this.drawLayer.batchDraw();
	}

	private endMove(): void {
		this.moveDrag = null;
		this.bakeSelection();
	}

	private getStagePointer(): { x: number; y: number } | null {
		const pointer = this.stage.getPointerPosition();
		if (!pointer) return null;
		const scale = this.stage.scaleX() || 1;
		return { x: pointer.x / scale, y: pointer.y / scale };
	}

	private startStroke(point: { x: number; y: number }): void {
		let annotation: DraggedAnnotation;
		switch (this.mode) {
			case "pen":
				annotation = { kind: "pen", points: [point.x, point.y], color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "box":
				annotation = { kind: "box", x: point.x, y: point.y, width: 0, height: 0, color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "highlight":
				annotation = { kind: "highlight", x: point.x, y: point.y, width: 0, height: 0, color: this.palette.color };
				break;
			case "arrow":
				annotation = { kind: "arrow", x1: point.x, y1: point.y, x2: point.x, y2: point.y, color: this.palette.color, strokeWidth: this.palette.strokeWidth };
				break;
			case "blackout":
				annotation = { kind: "blackout", x: point.x, y: point.y, width: 0, height: 0 };
				break;
			case "text":
			case "select":
				return;
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
			case "highlight":
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
			(a.kind === "box" || a.kind === "blackout" || a.kind === "highlight") && a.width < 4 && a.height < 4;
		const tooShort = a.kind === "pen" && a.points.length < 4;
		const arrowSamePoint = a.kind === "arrow" && Math.hypot(a.x2 - a.x1, a.y2 - a.y1) < 4;
		if (tooSmall || tooShort || arrowSamePoint) {
			this.removeNode(a);
			this.drawLayer.batchDraw();
			return;
		}
		this.annotations.push(a);
		this.drawLayer.batchDraw();
	}

	private openTextEditor(point: { x: number; y: number }): void {
		this.commitTextEditor();
		const scale = this.stage.scaleX() || 1;
		const screenX = point.x * scale;
		const screenY = point.y * scale;
		const fontSize = (this.editingText?.fontSize ?? DEFAULT_TEXT_FONT_SIZE) * scale;
		const color = this.editingText?.color ?? this.palette.color;
		const editor = activeDocument.createElement("textarea");
		editor.addClass("toolbox-annotation-text-editor");
		editor.dataset.left = String(screenX);
		editor.dataset.top = String(screenY);
		editor.dataset.color = color;
		editor.value = this.editingText?.text ?? "";
		editor.placeholder = "Type text. Enter to confirm, esc to cancel.";
		this.container.appendChild(editor);
		this.textEditor = editor;
		this.positionTextEditor(editor, screenX, screenY, fontSize, color);
		editor.focus();
		editor.select();
		editor.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.commitTextEditor();
			} else if (e.key === "Escape") {
				e.preventDefault();
				this.cancelTextEditor();
			}
		});
		editor.addEventListener("blur", () => {
			this.commitTextEditor();
		});
	}

	private beginEditExistingText(annotation: TextAnnotation, node: Konva.Text): void {
		this.deselect();
		this.editingText = annotation;
		// Hide the live node while editing so it does not show behind the editor.
		node.visible(false);
		this.drawLayer.batchDraw();
		// openTextEditor reads this.editingText for prefill text/color/size.
		this.openTextEditor({ x: annotation.x, y: annotation.y });
	}

	private positionTextEditor(editor: HTMLTextAreaElement, screenX: number, screenY: number, fontSize: number, color: string): void {
		editor.style.left = `${screenX}px`;
		editor.style.top = `${screenY}px`;
		editor.style.fontSize = `${fontSize}px`;
		editor.style.color = color;
	}

	private commitTextEditor(): void {
		const editor = this.textEditor;
		if (!editor) return;
		const text = editor.value.trim();
		const x = Number(editor.dataset.left ?? "0") / (this.stage.scaleX() || 1);
		const y = Number(editor.dataset.top ?? "0") / (this.stage.scaleY() || 1);
		const color = editor.dataset.color ?? this.palette.color;
		const editing = this.editingText;
		this.textEditor = null;
		this.editingText = null;
		editor.remove();

		if (editing) {
			// Re-editing a committed text object: update in place, or delete it if
			// the user cleared the text.
			if (!text) {
				const idx = this.annotations.indexOf(editing);
				if (idx >= 0) this.annotations.splice(idx, 1);
				this.removeNode(editing);
			} else {
				editing.text = text;
				const node = this.nodes.get(editing);
				if (node) {
					node.visible(true);
					this.applyToNode(editing, node);
				}
			}
			this.drawLayer.batchDraw();
			return;
		}

		if (!text) return;
		const annotation: Annotation = {
			kind: "text",
			x,
			y,
			text,
			color,
			fontSize: DEFAULT_TEXT_FONT_SIZE,
		};
		this.annotations.push(annotation);
		this.addNode(annotation);
		this.redoStack = [];
	}

	private cancelTextEditor(): void {
		const editor = this.textEditor;
		if (!editor) return;
		const editing = this.editingText;
		this.textEditor = null;
		this.editingText = null;
		editor.remove();
		if (editing) {
			const node = this.nodes.get(editing);
			if (node) node.visible(true);
			this.drawLayer.batchDraw();
		}
	}

	private addNode(a: Annotation): void {
		const node = this.buildNode(a);
		// Nodes are never Konva-draggable. Movement is driven manually by stage
		// pointer events (see handleSelectPointerDown / updateMove) so the buggy
		// Transformer proxy-drag never runs. The Transformer is used only for
		// resize/rotate via its anchors, which work on non-draggable nodes.
		node.draggable(false);
		this.nodes.set(a, node);
		this.nodeToAnnotation.set(node, a);
		this.drawLayer.add(node);
		this.drawLayer.batchDraw();
	}

	private removeNode(a: Annotation): void {
		const node = this.nodes.get(a);
		if (!node) return;
		this.nodeToAnnotation.delete(node);
		node.destroy();
		this.nodes.delete(a);
		const selIdx = this.selection.indexOf(a);
		if (selIdx >= 0) {
			this.selection.splice(selIdx, 1);
			this.syncTransformer();
		}
	}

	private refreshNode(a: Annotation): void {
		const node = this.nodes.get(a);
		if (!node) return;
		this.applyToNode(a, node);
		this.drawLayer.batchDraw();
	}

	private buildNode(a: Annotation): AnnotationNode {
		switch (a.kind) {
			case "pen":
				return new Konva.Line({
					points: a.points,
					stroke: a.color,
					strokeWidth: a.strokeWidth,
					hitStrokeWidth: Math.max(a.strokeWidth, MIN_HIT_STROKE_WIDTH),
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
					rotation: a.rotation ?? 0,
					stroke: a.color,
					strokeWidth: a.strokeWidth,
				});
			case "highlight":
				return new Konva.Rect({
					x: a.x,
					y: a.y,
					width: a.width,
					height: a.height,
					rotation: a.rotation ?? 0,
					fill: a.color,
					opacity: HIGHLIGHT_OPACITY,
					globalCompositeOperation: "multiply",
				});
			case "arrow":
				return new Konva.Arrow({
					points: [a.x1, a.y1, a.x2, a.y2],
					stroke: a.color,
					fill: a.color,
					strokeWidth: a.strokeWidth,
					hitStrokeWidth: Math.max(a.strokeWidth, MIN_HIT_STROKE_WIDTH),
					pointerLength: 10,
					pointerWidth: 10,
				});
			case "blackout":
				return new Konva.Rect({
					x: a.x,
					y: a.y,
					width: a.width,
					height: a.height,
					rotation: a.rotation ?? 0,
					fill: "#000000",
				});
			case "text":
				return new Konva.Text({
					x: a.x,
					y: a.y,
					rotation: a.rotation ?? 0,
					text: a.text,
					fontSize: a.fontSize,
					fontFamily: "sans-serif",
					fontStyle: "bold",
					fill: a.color,
				});
		}
	}

	private applyToNode(a: Annotation, node: AnnotationNode): void {
		switch (a.kind) {
			case "pen":
				(node as Konva.Line).points(a.points);
				break;
			case "box":
			case "blackout":
			case "highlight":
				node.position({ x: a.x, y: a.y });
				node.rotation(a.rotation ?? 0);
				(node as Konva.Rect).width(a.width);
				(node as Konva.Rect).height(a.height);
				break;
			case "arrow":
				(node as Konva.Arrow).points([a.x1, a.y1, a.x2, a.y2]);
				break;
			case "text":
				node.position({ x: a.x, y: a.y });
				node.rotation(a.rotation ?? 0);
				(node as Konva.Text).text(a.text);
				(node as Konva.Text).fill(a.color);
				(node as Konva.Text).fontSize(a.fontSize);
				break;
		}
	}

	// --- Selection + transform (D1, D4) ------------------------------------

	private toggleInSelection(a: Annotation, additive: boolean): void {
		if (additive) {
			const idx = this.selection.indexOf(a);
			if (idx >= 0) this.selection.splice(idx, 1);
			else this.selection.push(a);
		} else {
			this.selection = [a];
		}
		this.syncTransformer();
		this.notifySelectionChange();
	}

	private setSelection(items: Annotation[]): void {
		this.selection = items;
		this.syncTransformer();
		this.notifySelectionChange();
	}

	private deselect(): void {
		if (this.selection.length === 0) {
			this.syncTransformer();
			return;
		}
		this.selection = [];
		this.syncTransformer();
		this.notifySelectionChange();
	}

	private syncTransformer(): void {
		const nodes: Konva.Node[] = [];
		for (const a of this.selection) {
			const node = this.nodes.get(a);
			if (node) nodes.push(node);
		}
		this.transformer.nodes(nodes);
		this.transformer.moveToTop();
		this.drawLayer.batchDraw();
	}

	private notifySelectionChange(): void {
		for (const cb of this.selectionListeners) cb();
	}

	private bakeSelection(): void {
		for (const a of this.selection) {
			const node = this.nodes.get(a);
			if (node) this.bakeNode(a, node);
		}
		this.syncTransformer();
	}

	// Write a node's live Konva transform (drag offset, Transformer scale and
	// rotation) back into the plain annotation data, then reset the node's
	// transform to identity so the data stays the single source of truth.
	private bakeNode(a: Annotation, node: AnnotationNode): void {
		switch (a.kind) {
			case "box":
			case "blackout":
			case "highlight": {
				const rect = node as Konva.Rect;
				a.x = rect.x();
				a.y = rect.y();
				a.width = Math.max(1, rect.width() * rect.scaleX());
				a.height = Math.max(1, rect.height() * rect.scaleY());
				a.rotation = rect.rotation();
				rect.scale({ x: 1, y: 1 });
				rect.width(a.width);
				rect.height(a.height);
				break;
			}
			case "text": {
				const text = node as Konva.Text;
				// Text scales uniformly via the Transformer; fold the scale into
				// font size so the stored model carries no residual scale.
				const factor = text.scaleX();
				a.fontSize = Math.max(4, a.fontSize * factor);
				a.x = text.x();
				a.y = text.y();
				a.rotation = text.rotation();
				text.scale({ x: 1, y: 1 });
				text.fontSize(a.fontSize);
				break;
			}
			case "pen": {
				const line = node as Konva.Line;
				a.points = mapPointsThroughTransform(line.getTransform().copy(), a.points);
				this.resetNodeTransform(line);
				line.points(a.points);
				break;
			}
			case "arrow": {
				const arrow = node as Konva.Arrow;
				const mapped = mapPointsThroughTransform(arrow.getTransform().copy(), [a.x1, a.y1, a.x2, a.y2]);
				a.x1 = mapped[0] ?? a.x1;
				a.y1 = mapped[1] ?? a.y1;
				a.x2 = mapped[2] ?? a.x2;
				a.y2 = mapped[3] ?? a.y2;
				this.resetNodeTransform(arrow);
				arrow.points([a.x1, a.y1, a.x2, a.y2]);
				break;
			}
		}
		this.drawLayer.batchDraw();
	}

	private resetNodeTransform(node: Konva.Node): void {
		node.position({ x: 0, y: 0 });
		node.scale({ x: 1, y: 1 });
		node.rotation(0);
	}

	private applyColorToSelection(color: string): void {
		if (this.selection.length === 0) return;
		for (const a of this.selection) {
			if (a.kind === "blackout") continue;
			a.color = color;
			this.refreshNode(a);
		}
	}

	private applyStrokeWidthToSelection(width: number): void {
		if (this.selection.length === 0) return;
		for (const a of this.selection) {
			if (a.kind === "pen" || a.kind === "box" || a.kind === "arrow") {
				a.strokeWidth = width;
				const node = this.nodes.get(a);
				if (node) (node as Konva.Shape).strokeWidth(width);
			}
		}
		this.drawLayer.batchDraw();
	}
}
