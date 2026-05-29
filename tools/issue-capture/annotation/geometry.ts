// Konva-free geometry helpers for the annotation bake step. Kept free of any
// Konva import so they unit-test without the (ESM-only) Konva bundle.

export interface Point {
	x: number;
	y: number;
}

// Anything that can map a point through an affine transform. Konva.Transform
// satisfies this structurally, so the stage passes its live transform straight
// in while tests pass a hand-built mapper.
export interface PointMapper {
	point(p: Point): Point;
}

// Map a flat [x0,y0,x1,y1,...] list through a transform. Trailing unpaired
// coordinates are dropped (point lists are always pairs).
export function mapPointsThroughTransform(mapper: PointMapper, points: number[]): number[] {
	const out: number[] = [];
	for (let i = 0; i + 1 < points.length; i += 2) {
		const mapped = mapper.point({ x: points[i] ?? 0, y: points[i + 1] ?? 0 });
		out.push(mapped.x, mapped.y);
	}
	return out;
}
