/**
 * @file Spec — the map editor's document model: what each element kind IS,
 * every CRUD operation, and every refusal.
 *
 * The refusals are the point of this file. A map editor whose operations
 * decline silently is exactly the editor the operator rejected: the two lint
 * rules a saved scene is judged by (`geometry.keepout-degenerate` and
 * `keepout.splice-type-unknown`) have to be unreachable from the editing
 * surface, and "unreachable" means the mutator ANSWERS with the reason rather
 * than returning the document unchanged and hoping the chrome asked first.
 */
import { describe, expect, it } from "vitest";
import {
  KEEP_OUT_DEGENERATE_RULE,
  PATH_POINT_TYPE,
  SPLICE_TYPE_UNKNOWN_RULE,
  STATION_TYPE,
  addEdge,
  addKeepOut,
  addKeepOutPolygon,
  addKeepOutWall,
  addPoint,
  addSpliceArea,
  edgeById,
  edgeLabel,
  edgeMidpoint,
  edgeProblem,
  edgesAtPoint,
  insertRingVertex,
  keepOutById,
  keepOutKindOf,
  moveMany,
  moveRingVertex,
  nextPointId,
  parseRingHandleId,
  parseRingPathId,
  pointAt,
  pointById,
  pointLabel,
  removeMany,
  removeRingVertex,
  ringHandleId,
  ringOf,
  ringPathId,
  runCentre,
  runProblem,
  setEdgeOneWay,
  setPointLabel,
  setPointType,
  setPointYaw,
  setSpliceAreaType,
  spliceAreaById,
  spliceTypeProblem,
  splitEdge,
  widestRingSide,
  type SceneDocument,
  type SceneEdit,
} from "./scene-document";

/**
 * Two stations, one path point, two lines, one wall, one polygon, one zone —
 * one of everything, so a spec never has to build the shape it is about to
 * assert on.
 */
const SEED: SceneDocument = {
  points: [
    { id: "0000", x: 0, y: 0, yaw: 0, type: STATION_TYPE, defineType: "home" },
    { id: "0001", x: 2, y: 0, yaw: Math.PI, type: STATION_TYPE, defineType: "wc" },
    { id: "0002", x: 4, y: 0, yaw: 0, type: PATH_POINT_TYPE },
  ],
  edges: [
    { id: "e0", src: "0000", dst: "0001", oneWay: "0", single: "0" },
    { id: "e1", src: "0001", dst: "0002", oneWay: "1", single: "2" },
  ],
  keepOuts: [
    { id: "k-wall", points: [{ x: 0, y: 5 }, { x: 3, y: 5 }] },
    {
      id: "k-poly",
      points: [{ x: 0, y: 8 }, { x: 2, y: 8 }, { x: 2, y: 10 }, { x: 0, y: 10 }],
    },
  ],
  spliceAreas: [
    { id: "s-ramp", type: "3", points: [{ x: 6, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 2 }] },
  ],
  sequence: 7,
};

/** The document an operation produced, or a failure naming the refusal. */
function applied(edit: SceneEdit): SceneDocument {
  if (!edit.ok) {
    throw new Error(`expected the edit to be accepted, but it refused: ${edit.reason}`);
  }
  return edit.document;
}

/** The reason an operation refused, or a failure saying it did not. */
function refusal(edit: SceneEdit): string {
  if (edit.ok) {
    throw new Error("expected the edit to be refused, but it was accepted");
  }
  return edit.reason;
}

describe("what an element IS", () => {
  it("derives a keep-out's meaning from its POINT COUNT, and stores no kind", () => {
    // The vendor stores an untyped list of [x, y]; two points bound a segment
    // the robot may not cross, three or more bound an area it may not enter.
    // A `kind` field would let a document claim "wall" about four points.
    expect(keepOutKindOf([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe("wall");
    expect(keepOutKindOf([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])).toBe("polygon");
    expect(Object.keys(keepOutById(SEED, "k-wall") ?? {})).toEqual(["id", "points"]);
  });

  it("names a station by its label and a path point by its id", () => {
    expect(pointLabel({ id: "0000", x: 0, y: 0, yaw: 0, type: STATION_TYPE, defineType: "home" }))
      .toBe("home");
    expect(pointLabel({ id: "0009", x: 0, y: 0, yaw: 0, type: PATH_POINT_TYPE })).toBe("point 0009");
    // A station nobody has named yet is still a station, and says so.
    expect(pointLabel({ id: "0022", x: 0, y: 0, yaw: 0, type: STATION_TYPE })).toBe("station 0022");
  });

  it("draws an edge's direction into its own name", () => {
    const bidirectional = edgeById(SEED, "e0");
    const oneWay = edgeById(SEED, "e1");
    expect(bidirectional).toBeDefined();
    expect(oneWay).toBeDefined();
    if (bidirectional === undefined || oneWay === undefined) {
      return;
    }
    expect(edgeLabel(SEED, bidirectional)).toBe("home ↔ wc");
    expect(edgeLabel(SEED, oneWay)).toBe("wc → point 0002");
  });
});

describe("the lint rules an editor must not let an operator reach", () => {
  it("refuses a run of fewer than two points, naming the rule", () => {
    const reason = runProblem([{ x: 0, y: 0 }]);
    expect(reason).toContain(KEEP_OUT_DEGENERATE_RULE);
    expect(reason).toContain("virtual wall needs exactly 2");
  });

  it("refuses a non-finite coordinate", () => {
    expect(runProblem([{ x: 0, y: 0 }, { x: Number.NaN, y: 1 }])).toContain(
      "not a finite number",
    );
    expect(runProblem([{ x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 1 }])).toContain(
      "not a finite number",
    );
  });

  it("refuses a run with zero extent — every point the same coordinate", () => {
    // Not the same test as "too few": three coincident corners are a polygon
    // by count and nothing at all by shape.
    expect(
      runProblem([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }]),
    ).toContain("zero length");
    expect(runProblem([{ x: 1, y: 1 }, { x: 1, y: 1.001 }])).toBeNull();
  });

  it("refuses a splice type outside the vendor's palette of eight, and accepts all eight", () => {
    for (const type of ["3", "4", "5", "6", "7", "8", "9", "10"]) {
      expect(spliceTypeProblem(type)).toBeNull();
    }
    for (const type of ["0", "2", "11", "100", "", "ramp"]) {
      expect(spliceTypeProblem(type)).toContain(SPLICE_TYPE_UNKNOWN_RULE);
    }
  });

  it("refuses a self-join, a missing end, and a second line on one pair", () => {
    expect(edgeProblem(SEED, "0000", "0000")).toContain("cannot be joined to itself");
    expect(edgeProblem(SEED, "0000", "9999")).toContain("9999 is not in this scene");
    // Either way round: the pair already holds a line.
    expect(edgeProblem(SEED, "0000", "0001")).toContain("already joined");
    expect(edgeProblem(SEED, "0001", "0000")).toContain("already joined");
    expect(edgeProblem(SEED, "0000", "0002")).toBeNull();
  });
});

describe("vertices", () => {
  it("hands out the next vendor id, one past the highest — not one past the count", () => {
    expect(nextPointId(SEED)).toBe("0003");
    const shortened = applied(removeMany(SEED, [{ kind: "point", id: "0001" }]));
    // "0002" survives, so "0002" is not handed out again.
    expect(nextPointId(shortened)).toBe("0003");
  });

  it("places a path point with no label and no facing, rounded to millimetres", () => {
    const edit = addPoint(SEED, { x: 1.23456, y: -2.98765 }, PATH_POINT_TYPE);
    const next = applied(edit);
    expect(edit.ok && edit.created).toBe("0003");
    const placed = pointById(next, "0003");
    expect(placed).toEqual({ id: "0003", x: 1.235, y: -2.988, yaw: 0, type: PATH_POINT_TYPE });
    expect(placed !== undefined && "defineType" in placed).toBe(false);
  });

  it("places a station with the label the operator stated", () => {
    const next = applied(addPoint(SEED, { x: 1, y: 1 }, STATION_TYPE, { defineType: "dock" }));
    expect(pointById(next, "0003")?.defineType).toBe("dock");
  });

  it("refuses a vertex with a non-finite position", () => {
    expect(refusal(addPoint(SEED, { x: Number.NaN, y: 0 }, STATION_TYPE))).toContain(
      "finite position",
    );
  });

  it("turns a station's facing, and refuses a facing that is not a number", () => {
    expect(pointById(applied(setPointYaw(SEED, "0000", 1.5)), "0000")?.yaw).toBe(1.5);
    expect(refusal(setPointYaw(SEED, "0000", Number.NaN))).toContain("finite number of radians");
    expect(refusal(setPointYaw(SEED, "9999", 0))).toContain("not in this scene");
  });

  it("renames a station, and refuses a name another station already carries", () => {
    expect(pointById(applied(setPointLabel(SEED, "0000", "  reception  ")), "0000")?.defineType)
      .toBe("reception");
    expect(refusal(setPointLabel(SEED, "0000", "wc"))).toContain('0001 is already named "wc"');
  });

  it("removes a station's name with an empty one, leaving the key ABSENT", () => {
    const renamed = pointById(applied(setPointLabel(SEED, "0000", "")), "0000");
    expect(renamed).toEqual({ id: "0000", x: 0, y: 0, yaw: 0, type: STATION_TYPE });
    expect(renamed !== undefined && "defineType" in renamed).toBe(false);
  });

  it("refuses to name a path point — the two are different things to the chassis", () => {
    expect(refusal(setPointLabel(SEED, "0002", "somewhere"))).toContain("is a path point");
  });

  it("converts a station to a path point, dropping the name AND the facing", () => {
    const converted = pointById(applied(setPointType(SEED, "0001", PATH_POINT_TYPE)), "0001");
    expect(converted).toEqual({ id: "0001", x: 2, y: 0, yaw: 0, type: PATH_POINT_TYPE });
  });

  it("converts a path point to a station, which can then be named", () => {
    const promoted = applied(setPointType(SEED, "0002", STATION_TYPE));
    expect(pointById(promoted, "0002")?.type).toBe(STATION_TYPE);
    expect(pointById(applied(setPointLabel(promoted, "0002", "xray")), "0002")?.defineType).toBe(
      "xray",
    );
  });

  it("takes every line that ended on a removed vertex", () => {
    expect(edgesAtPoint(SEED, "0001").map((edge) => edge.id)).toEqual(["e0", "e1"]);
    const next = applied(removeMany(SEED, [{ kind: "point", id: "0001" }]));
    expect(next.points.map((point) => point.id)).toEqual(["0000", "0002"]);
    expect(next.edges).toEqual([]);
  });
});

describe("lines", () => {
  it("joins two vertices with a bidirectional, non-narrow line", () => {
    const edit = addEdge(SEED, "0000", "0002");
    const next = applied(edit);
    expect(edit.ok && edit.created).toBe("new:edge:7");
    expect(edgeById(next, "new:edge:7")).toEqual({
      id: "new:edge:7",
      src: "0000",
      dst: "0002",
      oneWay: "0",
      single: "0",
    });
    // The allocator moved on, so the next key is not this one again.
    expect(next.sequence).toBe(8);
  });

  it("refuses a duplicate line with the reason, rather than adding a second", () => {
    expect(refusal(addEdge(SEED, "0001", "0000"))).toContain("already joined");
  });

  it("flips a line's direction", () => {
    expect(edgeById(applied(setEdgeOneWay(SEED, "e0", "1")), "e0")?.oneWay).toBe("1");
    expect(refusal(setEdgeOneWay(SEED, "nope", "1"))).toContain("not in this scene");
  });

  it("splits a line into two halves that inherit its direction and narrowness", () => {
    const edit = splitEdge(SEED, "e1", { x: 3, y: 0 });
    const next = applied(edit);
    expect(edit.ok && edit.created).toBe("0003");
    expect(edgeById(next, "e1")).toBeUndefined();
    expect(next.edges.map((edge) => `${edge.src}→${edge.dst}:${edge.oneWay}${edge.single}`)).toEqual(
      ["0000→0001:00", "0001→0003:12", "0003→0002:12"],
    );
    // The new vertex is a path point: it carries no name and no facing.
    expect(pointById(next, "0003")).toEqual({
      id: "0003",
      x: 3,
      y: 0,
      yaw: 0,
      type: PATH_POINT_TYPE,
    });
  });

  it("answers a line's midpoint, which is where a contextual insert acts", () => {
    expect(edgeMidpoint(SEED, "e1")).toEqual({ x: 3, y: 0 });
    expect(edgeMidpoint(SEED, "nope")).toBeNull();
  });
});

describe("keep-out entries and typed zones", () => {
  it("makes a wall from two points and a polygon from three, as ONE operation", () => {
    const wall = applied(addKeepOutWall(SEED, { x: 0, y: 0 }, { x: 1, y: 0 }));
    const made = keepOutById(wall, "new:keepout:7");
    expect(made?.points).toHaveLength(2);
    expect(keepOutKindOf(made?.points ?? [])).toBe("wall");

    const polygon = applied(
      addKeepOutPolygon(SEED, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]),
    );
    expect(keepOutKindOf(keepOutById(polygon, "new:keepout:7")?.points ?? [])).toBe("polygon");
  });

  it("collapses a corner placed on top of the previous one — the double click's second half", () => {
    const next = applied(
      addKeepOut(SEED, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 1.0002 },
      ]),
    );
    expect(keepOutById(next, "new:keepout:7")?.points).toHaveLength(3);
  });

  it("refuses a polygon of two points, and says a wall is what two points make", () => {
    const reason = refusal(addKeepOutPolygon(SEED, [{ x: 0, y: 0 }, { x: 1, y: 0 }]));
    expect(reason).toContain(KEEP_OUT_DEGENERATE_RULE);
    expect(reason).toContain("virtual wall");
  });

  it("refuses a keep-out of one usable point, however many were drawn", () => {
    expect(
      refusal(addKeepOut(SEED, [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }])),
    ).toContain(KEEP_OUT_DEGENERATE_RULE);
  });

  it("refuses a zone whose type is not in the palette, before looking at its shape", () => {
    expect(
      refusal(addSpliceArea(SEED, "99", [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])),
    ).toContain(SPLICE_TYPE_UNKNOWN_RULE);
  });

  it("retypes a zone among the eight, and refuses anything else", () => {
    expect(spliceAreaById(applied(setSpliceAreaType(SEED, "s-ramp", "10")), "s-ramp")?.type).toBe(
      "10",
    );
    expect(refusal(setSpliceAreaType(SEED, "s-ramp", "2"))).toContain(SPLICE_TYPE_UNKNOWN_RULE);
    expect(refusal(setSpliceAreaType(SEED, "nope", "3"))).toContain("not in this scene");
  });

  it("reaches a keep-out and a zone through one ring lookup", () => {
    expect(ringOf(SEED, "k-poly")?.kind).toBe("keep-out");
    expect(ringOf(SEED, "s-ramp")?.kind).toBe("splice");
    expect(ringOf(SEED, "nope")).toBeNull();
  });

  it("carries one corner without rounding it — the gesture already resolved it", () => {
    const next = applied(moveRingVertex(SEED, "k-poly", 2, { x: 2.12345, y: 9.5 }));
    expect(keepOutById(next, "k-poly")?.points[2]).toEqual({ x: 2.12345, y: 9.5 });
    expect(refusal(moveRingVertex(SEED, "k-poly", 9, { x: 0, y: 0 }))).toContain("no corner 9");
  });

  it("PROMOTES a wall to a polygon when a corner is inserted on it", () => {
    // The firmware stores both as the same list, so a wall with a corner in
    // the middle IS an area. Both of a two-point run's sides accept one.
    const next = applied(insertRingVertex(SEED, "k-wall", 0, { x: 1.5, y: 6 }));
    const promoted = keepOutById(next, "k-wall");
    expect(promoted?.points).toEqual([{ x: 0, y: 5 }, { x: 1.5, y: 6 }, { x: 3, y: 5 }]);
    expect(keepOutKindOf(promoted?.points ?? [])).toBe("polygon");
    expect(refusal(insertRingVertex(SEED, "k-wall", 5, { x: 0, y: 0 }))).toContain("no side 5");
  });

  it("DEMOTES a polygon to a wall when it is cut back to two corners", () => {
    const cut = applied(removeRingVertex(SEED, "k-poly", 3));
    expect(keepOutKindOf(keepOutById(cut, "k-poly")?.points ?? [])).toBe("polygon");
    const wall = applied(removeRingVertex(cut, "k-poly", 2));
    expect(keepOutKindOf(keepOutById(wall, "k-poly")?.points ?? [])).toBe("wall");
  });

  it("refuses the corner that would leave a keep-out with one point", () => {
    const reason = refusal(removeRingVertex(SEED, "k-wall", 0));
    expect(reason).toContain(KEEP_OUT_DEGENERATE_RULE);
    // Removing the ENTRY is the operator's decision to state, and it works.
    expect(keepOutById(applied(removeMany(SEED, [{ kind: "keep-out", id: "k-wall" }])), "k-wall"))
      .toBeUndefined();
  });

  it("names the widest side for a contextual insert, and never reads the pointer", () => {
    // k-poly is 2 wide and 2 tall, so side 0 (0,8)→(2,8) ties and wins by
    // order: the answer is stable across frames, which is the property a
    // contextual control needs.
    expect(widestRingSide(SEED.keepOuts[1]?.points ?? [])).toEqual({
      edgeIndex: 0,
      at: { x: 1, y: 8 },
    });
    expect(widestRingSide([{ x: 0, y: 0 }])).toBeNull();
  });

  it("answers a run's centre, which is where its own name is drawn", () => {
    expect(runCentre(SEED.keepOuts[1]?.points ?? [])).toEqual({ x: 1, y: 9 });
    expect(runCentre([])).toBeNull();
  });
});

describe("the ring proxy's ids", () => {
  it("round-trips a path id and a handle id, over ids that contain colons", () => {
    expect(parseRingPathId(ringPathId("new:keepout:3"))).toBe("new:keepout:3");
    expect(parseRingHandleId(ringHandleId("new:keepout:3", 1))).toEqual({
      entityId: "new:keepout:3",
      index: 1,
    });
  });

  it("keeps the two kinds of id apart, and rejects anything else", () => {
    // A handle id is not a path id, which is what stops a corner's press from
    // being routed to the whole segment.
    expect(parseRingPathId(ringHandleId("new:keepout:3", 0))).toBeNull();
    expect(parseRingHandleId(ringPathId("new:keepout:3"))).toBeNull();
    expect(parseRingPathId("0007")).toBeNull();
    expect(parseRingHandleId("0007")).toBeNull();
    expect(parseRingHandleId("ring:new:keepout:3#-1")).toBeNull();
    expect(parseRingHandleId("ring:new:keepout:3#x")).toBeNull();
  });
});

describe("one gesture is one edit", () => {
  it("moves vertices and ring corners together, into one document", () => {
    const next = applied(
      moveMany(SEED, [
        { kind: "point", id: "0000", at: { x: 0.5, y: 0.5 } },
        { kind: "ring-vertex", entityId: "k-poly", index: 0, at: { x: -1, y: 8 } },
      ]),
    );
    expect(pointById(next, "0000")).toMatchObject({ x: 0.5, y: 0.5 });
    expect(keepOutById(next, "k-poly")?.points[0]).toEqual({ x: -1, y: 8 });
  });

  it("refuses the WHOLE move when any member cannot be moved", () => {
    expect(
      refusal(
        moveMany(SEED, [
          { kind: "point", id: "0000", at: { x: 1, y: 1 } },
          { kind: "point", id: "9999", at: { x: 2, y: 2 } },
        ]),
      ),
    ).toContain("9999 is not in this scene");
  });

  it("refuses the WHOLE removal when any member cannot be removed", () => {
    // The station would have gone; because the corner could not, nothing does.
    const reason = refusal(
      removeMany(SEED, [
        { kind: "point", id: "0000" },
        { kind: "ring-vertex", entityId: "k-wall", index: 1 },
      ]),
    );
    expect(reason).toContain(KEEP_OUT_DEGENERATE_RULE);
  });

  it("removes several corners of one entry from the highest index down", () => {
    // Named as the caller saw them: taking corner 1 first would renumber 3.
    const next = applied(
      removeMany(SEED, [
        { kind: "ring-vertex", entityId: "k-poly", index: 1 },
        { kind: "ring-vertex", entityId: "k-poly", index: 3 },
      ]),
    );
    expect(keepOutById(next, "k-poly")?.points).toEqual([{ x: 0, y: 8 }, { x: 2, y: 10 }]);
  });

  it("does not ask about the corners of an entry that is being removed whole", () => {
    const next = applied(
      removeMany(SEED, [
        { kind: "keep-out", id: "k-wall" },
        { kind: "ring-vertex", entityId: "k-wall", index: 0 },
      ]),
    );
    expect(keepOutById(next, "k-wall")).toBeUndefined();
  });

  it("refuses an empty removal rather than committing a no-op undo step", () => {
    expect(refusal(removeMany(SEED, []))).toContain("nothing to remove");
    expect(refusal(moveMany(SEED, []))).toContain("at least one point");
  });
});

describe("a placement that lands on an existing vertex means that vertex", () => {
  it("finds the vertex a resolved position coincides with, within a millimetre", () => {
    expect(pointAt(SEED, { x: 2.0005, y: 0 })?.id).toBe("0001");
    expect(pointAt(SEED, { x: 2.01, y: 0 })).toBeNull();
  });
});
