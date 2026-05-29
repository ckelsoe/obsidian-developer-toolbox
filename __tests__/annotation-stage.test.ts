import { mapPointsThroughTransform, type PointMapper } from "../tools/issue-capture/annotation/geometry";

// The bake step (D1: move/resize/rotate) folds a node's live transform back
// into the flat point list stored on pen/arrow annotations. These tests pin
// that mapping with hand-built mappers, so no Konva (ESM-only) import is pulled
// into the jest runtime.

function translate(dx: number, dy: number): PointMapper {
	return { point: (p) => ({ x: p.x + dx, y: p.y + dy }) };
}

function scale(sx: number, sy: number): PointMapper {
	return { point: (p) => ({ x: p.x * sx, y: p.y * sy }) };
}

function rotate(rad: number): PointMapper {
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return { point: (p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }) };
}

describe("mapPointsThroughTransform", () => {
	const identity: PointMapper = { point: (p) => ({ x: p.x, y: p.y }) };

	test("identity transform leaves points unchanged", () => {
		expect(mapPointsThroughTransform(identity, [5, 5, 10, 20])).toEqual([5, 5, 10, 20]);
	});

	test("translation offsets every point (a drag)", () => {
		expect(mapPointsThroughTransform(translate(10, 20), [5, 5, 0, 0])).toEqual([15, 25, 10, 20]);
	});

	test("scale multiplies coordinates (a resize)", () => {
		expect(mapPointsThroughTransform(scale(2, 3), [5, 5])).toEqual([10, 15]);
	});

	test("90-degree rotation about the origin (a rotate)", () => {
		const [x, y] = mapPointsThroughTransform(rotate(Math.PI / 2), [1, 0]);
		expect(x).toBeCloseTo(0, 6);
		expect(y).toBeCloseTo(1, 6);
	});

	test("empty point list maps to empty", () => {
		expect(mapPointsThroughTransform(translate(5, 5), [])).toEqual([]);
	});

	test("odd trailing coordinate is ignored (pairs only)", () => {
		expect(mapPointsThroughTransform(translate(1, 1), [0, 0, 9])).toEqual([1, 1]);
	});
});
