/**
 * @file Spec — the direct-manipulation geometry primitives used to edit
 * keep-out rings and open paths.
 *
 * The cases are the acceptance criteria of the editor's geometry layer: vertex
 * append / insert / move / remove, a ring of fewer than three distinct corners
 * refused, and a ring that crosses itself detected by the pair of edges that
 * cross. All of it is pure arithmetic over metres, so this file needs no DOM
 * and no renderer.
 */
import { describe, it, expect } from "vitest";
import {
  appendVertex,
  closestPointOnSegment,
  insertVertexOnEdge,
  moveVertex,
  normaliseRing,
  pathSegments,
  removeVertex,
  ringEdges,
  ringProblem,
  ringProblemText,
  sameVertex,
  segmentsIntersect,
  selfIntersection,
  signedArea,
  type Vertex,
} from "./geometry";

/** A unit square, counter-clockwise, with no duplicated closing vertex. */
const SQUARE: readonly Vertex[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 2 },
  { x: 0, y: 2 },
];

describe("a ring is implicitly closed", () => {
  it("drops a duplicated closing vertex", () => {
    const withClose = [...SQUARE, { x: 0, y: 0 }];
    expect(normaliseRing(withClose)).toEqual(SQUARE);
  });

  it("drops consecutive repeats a double click leaves behind", () => {
    const doubled = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }];
    expect(normaliseRing(doubled)).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }]);
  });

  it("yields one edge per vertex, including the wrap-around", () => {
    const edges = ringEdges(SQUARE);
    expect(edges).toHaveLength(4);
    expect(edges[3]).toEqual({ a: { x: 0, y: 2 }, b: { x: 0, y: 0 }, index: 3 });
  });

  it("has no edges below two vertices", () => {
    expect(ringEdges([{ x: 1, y: 1 }])).toEqual([]);
  });

  it("treats two vertices a tenth of a millimetre apart as one point", () => {
    expect(sameVertex({ x: 0, y: 0 }, { x: 0.0001, y: 0 })).toBe(true);
    expect(sameVertex({ x: 0, y: 0 }, { x: 0.01, y: 0 })).toBe(false);
  });
});

describe("an open path is not implicitly closed", () => {
  const PATH: readonly Vertex[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
  ];

  it("yields one segment per adjacent pair and no wrap-around segment", () => {
    expect(pathSegments(PATH)).toEqual([
      { a: { x: 0, y: 0 }, b: { x: 2, y: 0 }, index: 0 },
      { a: { x: 2, y: 0 }, b: { x: 2, y: 2 }, index: 1 },
    ]);
    expect(pathSegments(PATH)).not.toContainEqual({
      a: { x: 2, y: 2 },
      b: { x: 0, y: 0 },
      index: 2,
    });
  });

  it("has no segments for fewer than two points", () => {
    expect(pathSegments([])).toEqual([]);
    expect(pathSegments([{ x: 1, y: 1 }])).toEqual([]);
  });
});

describe("editing a ring's vertices", () => {
  it("appends at the end", () => {
    expect(appendVertex(SQUARE, { x: 3, y: 3 })).toHaveLength(5);
    expect(appendVertex(SQUARE, { x: 3, y: 3 })[4]).toEqual({ x: 3, y: 3 });
  });

  it("inserts into the middle of the edge the operator clicked", () => {
    // Edge 0 runs (0,0) -> (2,0); a corner dropped on its midpoint becomes
    // vertex 1 and the ring stays in drawing order.
    const inserted = insertVertexOnEdge(SQUARE, 0, { x: 1, y: 0 });
    expect(inserted).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]);
  });

  it("inserts on the wrap-around edge by appending", () => {
    const inserted = insertVertexOnEdge(SQUARE, 3, { x: 0, y: 1 });
    expect(inserted[4]).toEqual({ x: 0, y: 1 });
    expect(inserted).toHaveLength(5);
  });

  it("leaves the ring alone when the edge index names no edge", () => {
    expect(insertVertexOnEdge(SQUARE, 9, { x: 0, y: 1 })).toBe(SQUARE);
    expect(insertVertexOnEdge(SQUARE, -1, { x: 0, y: 1 })).toBe(SQUARE);
  });

  it("moves one vertex and nothing else", () => {
    const moved = moveVertex(SQUARE, 2, { x: 5, y: 5 });
    expect(moved[2]).toEqual({ x: 5, y: 5 });
    expect(moved[0]).toEqual({ x: 0, y: 0 });
    expect(moved).toHaveLength(4);
  });

  it("leaves the ring alone when the vertex index names no vertex", () => {
    expect(moveVertex(SQUARE, 7, { x: 5, y: 5 })).toBe(SQUARE);
  });

  it("removes one vertex", () => {
    expect(removeVertex(SQUARE, 0)).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]);
  });

  it("leaves the ring alone when the removal index names no vertex", () => {
    expect(removeVertex(SQUARE, 4)).toBe(SQUARE);
  });

  it("carries a caller's extra per-vertex data through every mutator", () => {
    // The editor attaches the vendor object each vertex was read from; the
    // mutators must not strip it off the vertices they do not touch.
    const tagged = [
      { x: 0, y: 0, raw: { tag: "a" } },
      { x: 2, y: 0, raw: { tag: "b" } },
      { x: 2, y: 2, raw: { tag: "c" } },
    ];
    const edited = removeVertex(
      moveVertex(appendVertex(tagged, { x: 0, y: 2, raw: { tag: "d" } }), 1, {
        x: 3,
        y: 0,
        raw: { tag: "b" },
      }),
      0,
    );
    expect(edited.map((vertex) => vertex.raw.tag)).toEqual(["b", "c", "d"]);
  });
});

describe("the closest point on a segment", () => {
  it("projects onto the segment", () => {
    expect(closestPointOnSegment({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 })).toEqual({
      x: 1,
      y: 1,
    });
  });

  it("returns a zero-length segment's only point", () => {
    expect(closestPointOnSegment({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 4, y: 4 })).toEqual({
      x: 1,
      y: 1,
    });
  });
});

describe("a ring the editor may save", () => {
  it("accepts a simple triangle", () => {
    expect(ringProblem([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }])).toBeNull();
  });

  it("refuses fewer than three distinct corners, and says how many there are", () => {
    expect(ringProblem([])).toEqual({ kind: "too-few-vertices", count: 0 });
    expect(ringProblem([{ x: 0, y: 0 }])).toEqual({ kind: "too-few-vertices", count: 1 });
    expect(ringProblem([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual({
      kind: "too-few-vertices",
      count: 2,
    });
  });

  it("counts three vertices that are really two as two", () => {
    // A third corner dropped on top of the first encloses nothing, and a count
    // of the array would have called this ring valid.
    expect(
      ringProblem([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0.0002 }]),
    ).toEqual({ kind: "too-few-vertices", count: 2 });
  });

  it("refuses a bow tie, naming the two edges that cross", () => {
    // (0,0) -> (2,2) -> (2,0) -> (0,2): edge 0 crosses edge 2.
    const bowTie: readonly Vertex[] = [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ];
    expect(selfIntersection(bowTie)).toEqual([0, 2]);
    expect(ringProblem(bowTie)).toEqual({ kind: "self-intersecting", edges: [0, 2] });
  });

  it("does not call two adjacent edges' shared corner a crossing", () => {
    expect(selfIntersection(SQUARE)).toBeNull();
  });

  it("states every problem as a sentence, because a disabled Save must say why", () => {
    expect(ringProblemText(null)).toBeNull();
    expect(ringProblemText({ kind: "too-few-vertices", count: 2 })).toBe(
      "An area needs at least 3 corners; this one has 2.",
    );
    expect(ringProblemText({ kind: "self-intersecting", edges: [0, 2] })).toBe(
      "This area crosses itself between corners 1 and 3.",
    );
  });
});

describe("segment intersection", () => {
  it("finds a proper crossing", () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 }),
    ).toBe(true);
  });

  it("finds a collinear overlap", () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }),
    ).toBe(true);
  });

  it("reports two segments that miss", () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }),
    ).toBe(false);
  });
});

describe("signed area", () => {
  it("is the enclosed area, positive for a counter-clockwise ring", () => {
    expect(signedArea(SQUARE)).toBe(4);
    expect(signedArea([...SQUARE].reverse())).toBe(-4);
  });
});
