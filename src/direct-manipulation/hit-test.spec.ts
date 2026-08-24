/**
 * @file Spec — the direct-manipulation hit tests, and the one place pixels
 * become metres.
 *
 * The tolerance these functions take is METRES, never pixels, because only a
 * renderer knows the current zoom. These cases pin both halves of that: the
 * tests themselves are pure metre arithmetic, and `toleranceMetres` is the
 * conversion a caller does with the scale it measured, including what it
 * answers when the measurement is unusable.
 */
import { describe, it, expect } from "vitest";
import {
  areaBadgeAnchor,
  headingKnobAt,
  insideRing,
  nearestHandle,
  nearestPathSegment,
  nearestRingEdge,
  nearestVertex,
  toleranceMetres,
  type Handle,
} from "./hit-test";
import { closestPointOnSegment } from "./geometry";
import type { Vertex } from "./geometry";

const POINTS: readonly Handle[] = [
  { id: "1", x: 0, y: 0 },
  { id: "2", x: 3, y: 0 },
  { id: "3", x: 3.2, y: 0 },
];

const SQUARE: readonly Vertex[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 2 },
  { x: 0, y: 2 },
];

describe("picking one of many points", () => {
  it("answers the nearest candidate inside the tolerance", () => {
    const hit = nearestHandle(POINTS, { x: 3.05, y: 0 }, 0.5);
    expect(hit?.id).toBe("2");
    expect(hit?.distance).toBeCloseTo(0.05, 10);
  });

  it("answers nothing when the pointer is outside the tolerance", () => {
    expect(nearestHandle(POINTS, { x: 1.5, y: 0 }, 0.5)).toBeNull();
  });

  it("breaks a tie by the earlier candidate, so a stack resolves the same way twice", () => {
    const stacked: readonly Handle[] = [
      { id: "top", x: 1, y: 1 },
      { id: "under", x: 1, y: 1 },
    ];
    expect(nearestHandle(stacked, { x: 1, y: 1 }, 0.1)?.id).toBe("top");
  });

  it("answers nothing for an empty candidate list", () => {
    expect(nearestHandle([], { x: 0, y: 0 }, 1)).toBeNull();
  });
});

describe("picking a ring's handles", () => {
  it("finds the nearest corner", () => {
    const hit = nearestVertex(SQUARE, { x: 1.9, y: 2.05 }, 0.3);
    expect(hit?.index).toBe(2);
    expect(hit?.distance).toBeCloseTo(Math.hypot(0.1, 0.05), 10);
  });

  it("finds no corner when the pointer is in the middle of a side", () => {
    expect(nearestVertex(SQUARE, { x: 1, y: 0 }, 0.3)).toBeNull();
  });

  it("finds the side under the pointer and where on it a corner would land", () => {
    const hit = nearestRingEdge(SQUARE, { x: 1, y: 0.1 }, 0.3);
    expect(hit?.index).toBe(0);
    expect(hit?.at).toEqual({ x: 1, y: 0 });
    expect(hit?.distance).toBeCloseTo(0.1, 10);
  });

  it("finds the wrap-around side too", () => {
    expect(nearestRingEdge(SQUARE, { x: 0.05, y: 1 }, 0.3)?.index).toBe(3);
  });

  it("clamps to a segment's ends rather than running off it", () => {
    expect(closestPointOnSegment({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 9, y: 5 })).toEqual({
      x: 2,
      y: 0,
    });
    expect(closestPointOnSegment({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 4, y: 4 })).toEqual({
      x: 1,
      y: 1,
    });
  });
});

describe("picking an open path", () => {
  const PATH: readonly Vertex[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
  ];

  it("finds the nearest open segment and its closest point", () => {
    const hit = nearestPathSegment(PATH, { x: 1, y: 0.1 }, 0.3);
    expect(hit?.index).toBe(0);
    expect(hit?.at).toEqual({ x: 1, y: 0 });
    expect(hit?.distance).toBeCloseTo(0.1, 10);
  });

  it("does not make the last-to-first closing segment hittable", () => {
    expect(nearestPathSegment(PATH, { x: 1, y: 1 }, 0.2)).toBeNull();
  });
});

describe("which area the pointer is in", () => {
  it("says inside for a point within the ring", () => {
    expect(insideRing(SQUARE, { x: 1, y: 1 })).toBe(true);
  });

  it("says outside for a point beyond it", () => {
    expect(insideRing(SQUARE, { x: 3, y: 1 })).toBe(false);
  });

  it("says outside for a ring that encloses nothing", () => {
    expect(insideRing([{ x: 0, y: 0 }, { x: 1, y: 1 }], { x: 0.5, y: 0.5 })).toBe(false);
  });
});

describe("heading knobs", () => {
  it("displaces a handle along its world-frame yaw", () => {
    expect(headingKnobAt({ id: "pose", x: 1, y: 2, yaw: 0 }, 0.5)).toEqual({ x: 1.5, y: 2 });
  });

  it("answers nothing for a handle without yaw", () => {
    expect(headingKnobAt({ id: "point", x: 1, y: 2 }, 0.5)).toBeNull();
  });
});

describe("area badge anchors", () => {
  it("chooses the highest, rightmost tied vertex and is deterministic", () => {
    const anchor = areaBadgeAnchor(SQUARE, 1);
    expect(anchor.x).toBeCloseTo(2 + Math.SQRT1_2, 10);
    expect(anchor.y).toBeCloseTo(2 + Math.SQRT1_2, 10);
    expect(areaBadgeAnchor(SQUARE, 1)).toEqual(anchor);
  });

  it("pushes outside a counter-clockwise and clockwise ring", () => {
    expect(insideRing(SQUARE, areaBadgeAnchor(SQUARE, 1))).toBe(false);
    const clockwise = [...SQUARE].reverse();
    expect(insideRing(clockwise, areaBadgeAnchor(clockwise, 1))).toBe(false);
  });

  it("falls back to one outward edge normal for collinear adjacent edges", () => {
    const collinear: readonly Vertex[] = [
      { x: -2, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 2, y: 0 },
    ];
    expect(areaBadgeAnchor(collinear, 1)).toEqual({ x: -1, y: 2 });
  });
});

describe("turning a pixel target into a metre tolerance", () => {
  it("scales a pixel radius into metres", () => {
    expect(toleranceMetres(0.05, 12, 0.4)).toBeCloseTo(0.6, 10);
  });

  it("falls back to the caller's metre tolerance when the scale is unknown", () => {
    expect(toleranceMetres(null, 12, 0.4)).toBe(0.4);
    expect(toleranceMetres(0, 12, 0.4)).toBe(0.4);
    expect(toleranceMetres(Number.NaN, 12, 0.4)).toBe(0.4);
  });
});
