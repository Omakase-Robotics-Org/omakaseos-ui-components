/**
 * @file Spec — the direct-manipulation intent kernel: a world-frame probe's
 * affordance, the thing a drag takes hold of, and the intent a click or release
 * expresses.
 *
 * These cases pin the negative guarantees as directly as the positive grammar:
 * direct clicks never place or move, unselected rings never expose deformable
 * geometry, armed-mode drags belong to the camera, and open paths never acquire
 * a synthetic closing segment.
 */
import { describe, expect, it } from "vitest";
import { BADGE_ANCHOR_OFFSET_SCALE, COARSE_PICK_SCALE } from "./constants";
import {
  cursorFor,
  modeRefusalsFor,
  persistentGhosts,
  resolveAffordance,
  resolveClick,
  resolveDragRelease,
  resolveGrip,
  type DragGrip,
  type EditAffordance,
  type EditAnchors,
  type EditCapabilities,
  type EditProbe,
  type EditPickClass,
  type EditScene,
  type EditScreenPick,
  type EditTolerances,
} from "./grammar";
import { areaBadgeAnchor, handleBadgeAnchor, headingKnobAt } from "./hit-test";

const SUPPORTED: EditCapabilities = { areas: { supported: true } };
const REFUSAL = "This recording stores no keep-out areas.";
const UNSUPPORTED: EditCapabilities = { areas: { supported: false, reason: REFUSAL } };

const TOLERANCE: EditTolerances = {
  handleM: 0.25,
  ghostM: 0.2,
  knobM: 0.2,
  badgeM: 0.2,
  headingArmM: 1,
};

const NAN_TOLERANCE: EditTolerances = {
  handleM: Number.NaN,
  ghostM: Number.NaN,
  knobM: Number.NaN,
  badgeM: Number.NaN,
  headingArmM: Number.NaN,
};

/** Three ordered handles and one triangular area, all in world metres. */
const SCENE: EditScene = {
  handles: [
    { id: "h0", x: 0, y: 0, yaw: 0 },
    { id: "h1", x: 4, y: 0 },
    { id: "h2", x: 4, y: 4 },
  ],
  paths: [{ id: "route", handleIds: ["h0", "missing", "h1", "h2"] }],
  areas: [
    {
      id: "area",
      ring: [
        { x: 10, y: 10 },
        { x: 14, y: 10 },
        { x: 12, y: 14 },
      ],
    },
  ],
};

function probe(overrides: Partial<EditProbe> = {}): EditProbe {
  return {
    mode: "direct",
    modality: "fine",
    scene: SCENE,
    selection: null,
    at: { x: 30, y: 30 },
    tolerance: TOLERANCE,
    capabilities: SUPPORTED,
    drawing: null,
    ...overrides,
  };
}

function onlyKind(scene: EditScene, at: EditProbe["at"], tolerance: EditTolerances = TOLERANCE) {
  return probe({ scene, at, tolerance });
}

function proximityScreenPick(
  target: EditProbe["at"],
  seen: EditPickClass[] = [],
): EditScreenPick {
  return (klass, candidates, modality) => {
    seen.push(klass);
    expect(modality).toBe("fine");
    const nearest = candidates
      .map((candidate, index) => ({
        index,
        distance: Math.hypot(candidate.x - target.x, candidate.y - target.y),
      }))
      .reduce(
        (best, candidate) => candidate.distance < best.distance ? candidate : best,
        { index: -1, distance: Number.POSITIVE_INFINITY },
      );
    return nearest.distance <= 1e-6 ? nearest.index : null;
  };
}

describe("direct clicks preserve the click-only grammar", () => {
  it("[1 / §4.1.1] exhaustively limits every direct affordance to select, deselect, delete, or nothing", () => {
    const ring = SCENE.areas[0]?.ring ?? [];
    const handle = SCENE.handles[0];
    if (handle === undefined) {
      throw new Error("fixture has no selected handle");
    }
    const knob = headingKnobAt(handle, TOLERANCE.headingArmM);
    if (knob === null) {
      throw new Error("fixture handle has no heading knob");
    }
    const directSituations: readonly {
      readonly name: string;
      readonly value: EditProbe;
      readonly affordance: EditAffordance["kind"];
      readonly intent: string;
    }[] = [
      {
        name: "handle badge",
        value: probe({
          selection: { kind: "handle", id: "h0" },
          at: handleBadgeAnchor(handle, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM),
        }),
        affordance: "badge",
        intent: "delete-handle",
      },
      {
        name: "area badge",
        value: probe({
          selection: { kind: "area", id: "area" },
          at: areaBadgeAnchor(ring, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM),
        }),
        affordance: "badge",
        intent: "delete-area",
      },
      {
        name: "vertex badge",
        value: probe({
          selection: { kind: "area", id: "area" },
          at: handleBadgeAnchor(ring[0] ?? { x: 10, y: 10 }, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM),
        }),
        affordance: "badge",
        intent: "delete-vertex",
      },
      {
        name: "heading knob",
        value: probe({ selection: { kind: "handle", id: "h0" }, at: knob }),
        affordance: "knob",
        intent: "nothing",
      },
      {
        name: "unselected handle",
        value: probe({ at: { x: 4, y: 0 } }),
        affordance: "handle",
        intent: "select",
      },
      {
        name: "selected handle away from its badge",
        value: probe({ selection: { kind: "handle", id: "h1" }, at: { x: 3.9, y: -0.1 } }),
        affordance: "handle",
        intent: "deselect",
      },
      {
        name: "selected ring edge ghost",
        value: probe({ selection: { kind: "area", id: "area" }, at: { x: 12, y: 10 } }),
        affordance: "ghost-vertex",
        intent: "nothing",
      },
      {
        name: "selected ring vertex",
        value: probe({
          selection: { kind: "area", id: "area" },
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02, badgeM: 0.01 },
        }),
        affordance: "vertex",
        intent: "nothing",
      },
      {
        name: "path ghost",
        value: probe({ at: { x: 2, y: 0.1 } }),
        affordance: "ghost",
        intent: "nothing",
      },
      {
        name: "unselected area interior",
        value: probe({ at: { x: 12, y: 11 } }),
        affordance: "area",
        intent: "select",
      },
      {
        name: "selected area interior",
        value: probe({ selection: { kind: "area", id: "area" }, at: { x: 12, y: 11 } }),
        affordance: "area",
        intent: "deselect",
      },
      {
        name: "empty floor",
        value: probe(),
        affordance: "floor",
        intent: "deselect",
      },
    ];
    const allowed = new Set([
      "select",
      "deselect",
      "delete-handle",
      "delete-vertex",
      "delete-area",
      "nothing",
    ]);

    for (const situation of directSituations) {
      expect(resolveAffordance(situation.value).kind, situation.name).toBe(situation.affordance);
      const intent = resolveClick(situation.value);
      expect(intent.kind, situation.name).toBe(situation.intent);
      expect(allowed.has(intent.kind), situation.name).toBe(true);
    }
  });

  it("clicking a selected handle's exact center deselects - the badge never covers its target", () => {
    // Regression: with the anchor at 1x the pick radius the badge's pick disc
    // passed exactly through the handle's center, so re-clicking a selected
    // handle deleted it instead of deselecting. BADGE_ANCHOR_OFFSET_SCALE
    // keeps the disc clear of the center by a full pick radius.
    const center = probe({ selection: { kind: "handle", id: "h1" }, at: { x: 4, y: 0 } });
    expect(resolveAffordance(center)).toEqual({ kind: "handle", id: "h1" });
    expect(resolveClick(center)).toEqual({ kind: "deselect" });

    const ring = SCENE.areas[0]?.ring ?? [];
    const vertexCenter = probe({
      selection: { kind: "area", id: "area" },
      at: ring[0] ?? { x: 10, y: 10 },
    });
    expect(resolveAffordance(vertexCenter).kind).toBe("vertex");
    expect(resolveClick(vertexCenter)).toEqual({ kind: "nothing" });
  });

  it("[2] deselects on empty floor whether or not anything was selected", () => {
    expect(resolveClick(probe())).toEqual({ kind: "deselect" });
    expect(resolveClick(probe({ selection: { kind: "handle", id: "h0" } }))).toEqual({
      kind: "deselect",
    });
    expect(resolveClick(probe({ selection: { kind: "area", id: "area" } }))).toEqual({
      kind: "deselect",
    });
  });
});

describe("selected-ring guardrails", () => {
  it("[3 / §4.1.5] exposes only an unselected area's interior, never its vertices or edge ghosts", () => {
    const nearVertex = probe({ at: { x: 10.1, y: 10.1 } });
    const nearEdge = probe({ at: { x: 12, y: 10.05 } });

    expect(resolveAffordance(nearVertex)).toEqual({ kind: "area", id: "area" });
    expect(resolveAffordance(nearEdge)).toEqual({ kind: "area", id: "area" });
    expect(resolveGrip(nearVertex)).toBeNull();
    expect(resolveGrip(nearEdge)).toBeNull();
    expect(resolveClick(nearVertex)).toEqual({
      kind: "select",
      target: { kind: "area", id: "area" },
    });
  });

  it("exposes the same ring's edge and vertex only after that area is selected", () => {
    expect(
      resolveAffordance(
        probe({ selection: { kind: "area", id: "area" }, at: { x: 12, y: 10.05 } }),
      ).kind,
    ).toBe("ghost-vertex");
    expect(
      resolveAffordance(
        probe({
          selection: { kind: "area", id: "area" },
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02, badgeM: 0.01 },
        }),
      ).kind,
    ).toBe("vertex");
  });
});

describe("the fixed affordance and grip priority", () => {
  it("[4 / §4.1.2] enforces badge > knob > handle > vertex > ghost-vertex > ghost > area > floor", () => {
    const overlapRing = SCENE.areas[0];
    if (overlapRing === undefined) {
      throw new Error("fixture has no area");
    }
    const badgeHandle = { id: "badge", x: 0, y: 0, yaw: Math.PI / 4 };
    const badgeAt = handleBadgeAnchor(badgeHandle, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    const badgeScene: EditScene = {
      handles: [badgeHandle],
      paths: [{ id: "under-badge", handleIds: ["badge", "other"] }],
      areas: [],
    };
    const knobScene: EditScene = {
      handles: [
        { id: "selected", x: 11.5, y: 11, yaw: 0 },
        { id: "under-knob", x: 12, y: 11 },
        { id: "line-end", x: 13, y: 11 },
      ],
      paths: [{ id: "under-knob-path", handleIds: ["under-knob", "line-end"] }],
      areas: SCENE.areas,
    };
    const edgeHandleScene: EditScene = {
      ...SCENE,
      handles: [...SCENE.handles, { id: "on-edge", x: 12, y: 10 }],
    };
    const vertexGhostScene: EditScene = {
      handles: [
        { id: "path-a", x: 9, y: 10.1 },
        { id: "path-b", x: 11, y: 10.1 },
      ],
      paths: [{ id: "through-vertex", handleIds: ["path-a", "path-b"] }],
      areas: [overlapRing],
    };
    const vertexHandleScene: EditScene = {
      ...vertexGhostScene,
      handles: [...vertexGhostScene.handles, { id: "on-vertex", x: 10.1, y: 10.1 }],
    };
    const areaGhostScene: EditScene = {
      handles: [
        { id: "inside-a", x: 11, y: 11 },
        { id: "inside-b", x: 13, y: 11 },
      ],
      paths: [{ id: "inside", handleIds: ["inside-a", "inside-b"] }],
      areas: [overlapRing],
    };
    const levels: readonly {
      readonly name: string;
      readonly value: EditProbe;
      readonly affordance: EditAffordance["kind"];
      readonly grip: DragGrip["kind"] | null;
    }[] = [
      {
        name: "badge shields a coincident knob and handle",
        value: probe({
          scene: badgeScene,
          selection: { kind: "handle", id: "badge" },
          at: badgeAt,
          tolerance: { ...TOLERANCE, headingArmM: TOLERANCE.badgeM },
        }),
        affordance: "badge",
        grip: null,
      },
      {
        name: "badge shields a selected-ring edge, vertex, path ghost, and area",
        value: probe({
          scene: vertexGhostScene,
          selection: { kind: "area", id: "area" },
          at: handleBadgeAnchor(overlapRing.ring[0] ?? { x: 10, y: 10 }, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM),
        }),
        affordance: "badge",
        grip: null,
      },
      {
        name: "knob shields a coincident handle, path ghost, and area",
        value: probe({
          scene: knobScene,
          selection: { kind: "handle", id: "selected" },
          at: { x: 12, y: 11 },
          tolerance: { ...TOLERANCE, headingArmM: 0.5 },
        }),
        affordance: "knob",
        grip: "rotate",
      },
      {
        name: "handle shields a selected-ring edge, path ghost, and area",
        value: probe({
          scene: edgeHandleScene,
          selection: { kind: "area", id: "area" },
          at: { x: 12, y: 10 },
        }),
        affordance: "handle",
        grip: "handle",
      },
      {
        name: "handle shields a selected-ring vertex, path ghost, and area",
        value: probe({
          scene: vertexHandleScene,
          selection: { kind: "area", id: "area" },
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, badgeM: 0.01, ghostM: 0.02 },
        }),
        affordance: "handle",
        grip: "handle",
      },
      {
        name: "selected-ring vertex shields its own edge ghost, a path ghost, and area",
        // The probe sits ON the vertex: both adjacent edges hit at distance
        // zero, and the through-vertex path passes underneath. A grabbable
        // point must still win, or vertices could never be moved.
        value: probe({
          scene: vertexGhostScene,
          selection: { kind: "area", id: "area" },
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, badgeM: 0.01, ghostM: 0.1 },
        }),
        affordance: "vertex",
        grip: "vertex",
      },
      {
        name: "selected-ring edge ghost shields a path ghost and area",
        // Away from every ring vertex and path handle (nearest is 0.4 m,
        // beyond handleM), on the ring's base edge with the through-vertex
        // path 0.05 m away.
        value: probe({
          scene: vertexGhostScene,
          selection: { kind: "area", id: "area" },
          at: { x: 10.4, y: 10.05 },
          tolerance: { ...TOLERANCE, badgeM: 0.01 },
        }),
        affordance: "ghost-vertex",
        grip: "insert-vertex",
      },
      {
        name: "path ghost shields area interior",
        value: probe({ scene: areaGhostScene, at: { x: 12, y: 11 } }),
        affordance: "ghost",
        grip: "insert",
      },
      {
        name: "area interior wins before floor",
        value: probe({ scene: { ...SCENE, paths: [] }, at: { x: 12, y: 11 } }),
        affordance: "area",
        grip: null,
      },
      {
        name: "floor is the final fallback",
        value: probe(),
        affordance: "floor",
        grip: null,
      },
    ];

    for (const level of levels) {
      expect(resolveAffordance(level.value).kind, level.name).toBe(level.affordance);
      expect(resolveGrip(level.value)?.kind ?? null, level.name).toBe(level.grip);
    }
  });
});

describe("screen-space pick delegation", () => {
  const anchors: EditAnchors = {
    knobAt: () => ({ x: 50, y: 50 }),
    badgeAt: () => ({ x: 60, y: 60 }),
  };

  it("resolves handle, ghost, knob, badge, and vertex with NaN metric tolerances", () => {
    const handleTarget = { x: 3, y: 4 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [{ id: "screen-handle", x: 3, y: 4 }],
            paths: [],
            areas: [],
          },
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(handleTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "handle", id: "screen-handle" });

    const ghostTarget = { x: 5, y: 0 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [
              { id: "ghost-start", x: 0, y: 0 },
              { id: "ghost-end", x: 10, y: 0 },
            ],
            paths: [{ id: "screen-path", handleIds: ["ghost-start", "ghost-end"] }],
            areas: [],
          },
          at: { x: 5, y: 2 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(ghostTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "ghost", pathId: "screen-path", segmentIndex: 0, at: ghostTarget });

    const knobTarget = { x: 50, y: 50 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [{ id: "screen-knob", x: 0, y: 0, yaw: 0 }],
            paths: [],
            areas: [],
          },
          selection: { kind: "handle", id: "screen-knob" },
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(knobTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "knob", id: "screen-knob", at: knobTarget });

    const badgeTarget = { x: 60, y: 60 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [{ id: "screen-badge", x: 0, y: 0 }],
            paths: [],
            areas: [],
          },
          selection: { kind: "handle", id: "screen-badge" },
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(badgeTarget),
          anchors,
        }),
      ),
    ).toEqual({
      kind: "badge",
      target: { kind: "handle", id: "screen-badge" },
      at: badgeTarget,
    });

    const vertexTarget = { x: 10, y: 10 };
    expect(
      resolveAffordance(
        probe({
          scene: { handles: [], paths: [], areas: [{ id: "screen-area", ring: [
            { x: 10, y: 10 },
            { x: 14, y: 10 },
            { x: 12, y: 14 },
          ] }] },
          selection: { kind: "area", id: "screen-area" },
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(vertexTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "vertex", areaId: "screen-area", index: 0 });
  });

  it("keeps badge above handle and handle above ghost under screen delegation", () => {
    const badgeTarget = { x: 100, y: 100 };
    const badgeAnchors: EditAnchors = {
      knobAt: () => null,
      badgeAt: () => badgeTarget,
    };
    const badgeSeen: EditPickClass[] = [];
    expect(
      resolveAffordance(
        probe({
          scene: { handles: [{ id: "selected", x: 0, y: 0 }], paths: [], areas: [] },
          selection: { kind: "handle", id: "selected" },
          at: { x: 0, y: 0 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(badgeTarget, badgeSeen),
          anchors: badgeAnchors,
        }),
      ),
    ).toEqual({
      kind: "badge",
      target: { kind: "handle", id: "selected" },
      at: badgeTarget,
    });
    expect(badgeSeen).toEqual(["badge"]);

    const handleTarget = { x: 5, y: 0 };
    const handleSeen: EditPickClass[] = [];
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [
              { id: "path-start", x: 0, y: 0 },
              { id: "path-end", x: 10, y: 0 },
              { id: "screen-middle", x: 5, y: 0 },
            ],
            paths: [{ id: "under-handle", handleIds: ["path-start", "path-end"] }],
            areas: [],
          },
          at: { x: 5, y: 1 },
          tolerance: NAN_TOLERANCE,
          screenPick: proximityScreenPick(handleTarget, handleSeen),
          anchors: badgeAnchors,
        }),
      ),
    ).toEqual({ kind: "handle", id: "screen-middle" });
    expect(handleSeen).toEqual(["handle"]);
  });

  it("honors the injected PointHandles answer over a metrically nearer other handle", () => {
    const authoritative = { x: 10, y: 0 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [
              { id: "metric-near", x: 0, y: 0 },
              { id: "screen-authoritative", x: 10, y: 0 },
            ],
            paths: [],
            areas: [],
          },
          at: { x: 0.01, y: 0 },
          screenPick: proximityScreenPick(authoritative),
        }),
      ),
    ).toEqual({ kind: "handle", id: "screen-authoritative" });
  });
});

describe("undeclared pointer frame fails loudly", () => {
  it("returns floor and deselects when screenPick is absent and all metric tolerances are NaN", () => {
    const cases: readonly EditProbe[] = [
      probe({
        scene: { handles: [{ id: "handle", x: 0, y: 0 }], paths: [], areas: [] },
        at: { x: 0, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: {
          handles: [
            { id: "ghost-start", x: 0, y: 0 },
            { id: "ghost-end", x: 10, y: 0 },
          ],
          paths: [{ id: "path", handleIds: ["ghost-start", "ghost-end"] }],
          areas: [],
        },
        at: { x: 5, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: { handles: [{ id: "knob", x: 0, y: 0, yaw: 0 }], paths: [], areas: [] },
        selection: { kind: "handle", id: "knob" },
        at: { x: 1, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: { handles: [{ id: "badge", x: 0, y: 0 }], paths: [], areas: [] },
        selection: { kind: "handle", id: "badge" },
        at: { x: 1, y: 1 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: {
          handles: [],
          paths: [],
          areas: [{ id: "area", ring: [{ x: 0, y: 0 }, { x: 4, y: 0 }] }],
        },
        selection: { kind: "area", id: "area" },
        at: { x: 0, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
    ];

    for (const value of cases) {
      expect(resolveAffordance(value)).toEqual({ kind: "floor" });
      expect(resolveClick(value)).toEqual({ kind: "deselect" });
    }
  });
});

describe("metric path unchanged", () => {
  it("keeps representative handle, path-ghost, and badge answers from v0.16.0", () => {
    const handleProbe = probe({ at: { x: 4, y: 0 } });
    expect(resolveAffordance(handleProbe)).toEqual({ kind: "handle", id: "h1" });
    expect(resolveClick(handleProbe)).toEqual({
      kind: "select",
      target: { kind: "handle", id: "h1" },
    });

    const ghostProbe = probe({ at: { x: 2, y: 0.1 } });
    expect(resolveAffordance(ghostProbe)).toEqual({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 0,
      at: { x: 2, y: 0 },
    });
    expect(resolveGrip(ghostProbe)).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 0,
      at: { x: 2, y: 0 },
    });

    const handle = SCENE.handles[0];
    if (handle === undefined) {
      throw new Error("fixture has no handle");
    }
    const badgeAt = handleBadgeAnchor(handle, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    const badgeProbe = probe({
      selection: { kind: "handle", id: handle.id },
      at: badgeAt,
    });
    expect(resolveAffordance(badgeProbe)).toEqual({
      kind: "badge",
      target: { kind: "handle", id: handle.id },
      at: badgeAt,
    });
    expect(resolveClick(badgeProbe)).toEqual({ kind: "delete-handle", id: handle.id });
  });
});

describe("world anchors shared by affordances and renderers", () => {
  it("[5] uses the contracted badge, knob, path-following ghost, and ring-edge anchors", () => {
    const handle = SCENE.handles[0];
    const ring = SCENE.areas[0]?.ring ?? [];
    if (handle === undefined) {
      throw new Error("fixture has no handle");
    }
    const handleBadge = handleBadgeAnchor(handle, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    expect(
      resolveAffordance(
        probe({ selection: { kind: "handle", id: handle.id }, at: handleBadge }),
      ),
    ).toEqual({ kind: "badge", target: { kind: "handle", id: handle.id }, at: handleBadge });

    const areaBadge = areaBadgeAnchor(ring, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    expect(
      resolveAffordance(probe({ selection: { kind: "area", id: "area" }, at: areaBadge })),
    ).toEqual({ kind: "badge", target: { kind: "area", id: "area" }, at: areaBadge });

    const vertexBadge = handleBadgeAnchor(ring[0] ?? { x: 10, y: 10 }, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    expect(
      resolveAffordance(probe({ selection: { kind: "area", id: "area" }, at: vertexBadge })),
    ).toEqual({
      kind: "badge",
      target: { kind: "vertex", areaId: "area", index: 0 },
      at: vertexBadge,
    });

    const knob = headingKnobAt(handle, TOLERANCE.headingArmM);
    if (knob === null) {
      throw new Error("fixture handle has no heading knob");
    }
    expect(
      resolveAffordance(probe({ selection: { kind: "handle", id: handle.id }, at: knob })),
    ).toEqual({ kind: "knob", id: handle.id, at: knob });

    expect(resolveAffordance(probe({ at: { x: 1.25, y: 0.1 } }))).toEqual({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 0,
      at: { x: 1.25, y: 0 },
    });
    expect(
      resolveAffordance(
        probe({ selection: { kind: "area", id: "area" }, at: { x: 11.25, y: 10.1 } }),
      ),
    ).toEqual({
      kind: "ghost-vertex",
      areaId: "area",
      edgeIndex: 0,
      at: { x: 11.25, y: 10 },
    });
  });

  it("resolves path handle ids in order, skips missing ids, and drops paths with fewer than two points", () => {
    expect(resolveAffordance(probe({ at: { x: 2, y: 0.1 } }))).toMatchObject({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 0,
    });
    const unresolved: EditScene = {
      handles: [{ id: "only", x: 0, y: 0 }],
      paths: [{ id: "broken", handleIds: ["missing-a", "only", "missing-b"] }],
      areas: [],
    };
    expect(resolveAffordance(onlyKind(unresolved, { x: 0, y: 0.1 }))).toEqual({
      kind: "handle",
      id: "only",
    });
    expect(persistentGhosts(unresolved, "coarse")).toEqual([]);
  });
});

describe("fine and coarse pick tolerances", () => {
  it("[6 / §4.1.10] multiplies every handle, vertex, ghost, knob, and badge pick radius by COARSE_PICK_SCALE", () => {
    expect(COARSE_PICK_SCALE).toBe(1.6);
    const small: EditTolerances = {
      handleM: 0.2,
      ghostM: 0.2,
      knobM: 0.2,
      badgeM: 0.01,
      headingArmM: 1,
    };
    const handleScene: EditScene = {
      handles: [{ id: "point", x: 0, y: 0 }],
      paths: [],
      areas: [],
    };
    const pathScene: EditScene = {
      handles: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 4, y: 0 },
      ],
      paths: [{ id: "path", handleIds: ["a", "b"] }],
      areas: [],
    };
    const knobScene: EditScene = {
      handles: [{ id: "pose", x: 0, y: 0, yaw: 0 }],
      paths: [],
      areas: [],
    };
    const badgeTolerance = { ...small, badgeM: 0.2 };
    const badgeHandle = badgeSceneHandle();
    const badgeAnchor = handleBadgeAnchor(badgeHandle, BADGE_ANCHOR_OFFSET_SCALE * badgeTolerance.badgeM);
    const badgeProbe = {
      x: badgeAnchor.x + 0.3 * Math.SQRT1_2,
      y: badgeAnchor.y + 0.3 * Math.SQRT1_2,
    };
    const cases: readonly {
      readonly name: string;
      readonly value: EditProbe;
      readonly coarseKind: EditAffordance["kind"];
    }[] = [
      {
        name: "handleM for handles",
        value: probe({ scene: handleScene, at: { x: 0.3, y: 0 }, tolerance: small }),
        coarseKind: "handle",
      },
      {
        name: "handleM for selected vertices",
        value: probe({
          scene: { handles: [], paths: [], areas: SCENE.areas },
          selection: { kind: "area", id: "area" },
          at: { x: 10 - 0.3 * Math.SQRT1_2, y: 10 - 0.3 * Math.SQRT1_2 },
          tolerance: { ...small, ghostM: 0.01 },
        }),
        coarseKind: "vertex",
      },
      {
        name: "ghostM for path ghosts",
        value: probe({ scene: pathScene, at: { x: 2, y: 0.3 }, tolerance: small }),
        coarseKind: "ghost",
      },
      {
        name: "ghostM for selected-ring edge ghosts",
        value: probe({
          scene: { handles: [], paths: [], areas: SCENE.areas },
          selection: { kind: "area", id: "area" },
          at: { x: 12, y: 9.7 },
          tolerance: small,
        }),
        coarseKind: "ghost-vertex",
      },
      {
        name: "knobM for heading knobs",
        value: probe({
          scene: knobScene,
          selection: { kind: "handle", id: "pose" },
          at: { x: 1, y: 0.3 },
          tolerance: small,
        }),
        coarseKind: "knob",
      },
      {
        name: "badgeM for delete badges",
        value: probe({
          scene: { handles: [badgeHandle], paths: [], areas: [] },
          selection: { kind: "handle", id: badgeHandle.id },
          at: badgeProbe,
          tolerance: badgeTolerance,
        }),
        coarseKind: "badge",
      },
    ];

    for (const entry of cases) {
      expect(resolveAffordance(entry.value).kind, `${entry.name} fine`).toBe("floor");
      expect(
        resolveAffordance({ ...entry.value, modality: "coarse" }).kind,
        `${entry.name} coarse`,
      ).toBe(entry.coarseKind);
    }
  });

  it("also applies the coarse handle radius when deciding whether to close a drawn ring", () => {
    const value = probe({
      mode: "draw-area",
      at: { x: 0.3, y: 0 },
      drawing: [{ x: 0, y: 0 }, { x: 2, y: 0 }],
      tolerance: { ...TOLERANCE, handleM: 0.2 },
    });
    expect(resolveClick(value)).toEqual({ kind: "draw", at: { x: 0.3, y: 0 } });
    expect(resolveClick({ ...value, modality: "coarse" })).toEqual({ kind: "close-ring" });
  });
});

function badgeSceneHandle() {
  return { id: "badged", x: 0, y: 0 } as const;
}

describe("armed modes", () => {
  it("[7 / §4.1.6] gives every append and draw-area drag to the camera", () => {
    for (const mode of ["append", "draw-area"] as const) {
      expect(resolveGrip(probe({ mode, at: { x: 0, y: 0 } })), mode).toBeNull();
    }
  });

  it("[7] exposes floor while armed, except for a refused draw-area mode", () => {
    expect(resolveAffordance(probe({ mode: "append", at: { x: 0, y: 0 } }))).toEqual({
      kind: "floor",
    });
    expect(resolveAffordance(probe({ mode: "draw-area", at: { x: 0, y: 0 } }))).toEqual({
      kind: "floor",
    });
    expect(
      resolveAffordance(
        probe({ mode: "append", capabilities: UNSUPPORTED, at: { x: 0, y: 0 } }),
      ),
    ).toEqual({ kind: "floor" });
    expect(
      resolveAffordance(
        probe({ mode: "draw-area", capabilities: UNSUPPORTED, at: { x: 0, y: 0 } }),
      ),
    ).toEqual({ kind: "refused", reason: REFUSAL });
  });

  it("[7] append always places exactly where the press landed", () => {
    expect(resolveClick(probe({ mode: "append", at: { x: 0, y: 0 } }))).toEqual({
      kind: "place",
      at: { x: 0, y: 0 },
    });
    expect(
      resolveClick(
        probe({ mode: "append", capabilities: UNSUPPORTED, at: { x: 30, y: 30 } }),
      ),
    ).toEqual({
      kind: "place",
      at: { x: 30, y: 30 },
    });
  });

  it("[7 / §4.1.8] closes only on a non-empty drawing's first vertex, otherwise drawing", () => {
    expect(
      resolveClick(
        probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 1.1, y: 1 } }),
      ),
    ).toEqual({ kind: "close-ring" });
    expect(resolveClick(probe({ mode: "draw-area", drawing: [], at: { x: 1, y: 1 } }))).toEqual({
      kind: "draw",
      at: { x: 1, y: 1 },
    });
    expect(resolveClick(probe({ mode: "draw-area", drawing: null, at: { x: 1, y: 1 } }))).toEqual({
      kind: "draw",
      at: { x: 1, y: 1 },
    });
    expect(
      resolveClick(
        probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 2, y: 2 } }),
      ),
    ).toEqual({ kind: "draw", at: { x: 2, y: 2 } });
  });

  it("[7 / §4.1.9] refuses unsupported area drawing with the exact declared reason", () => {
    expect(
      resolveClick(
        probe({ mode: "draw-area", capabilities: UNSUPPORTED, drawing: [], at: { x: 1, y: 1 } }),
      ),
    ).toEqual({ kind: "refused", reason: REFUSAL });
  });
});

describe("drag grips and releases", () => {
  it("[8] maps the full priority vocabulary to grips, with badges click-only", () => {
    const handle = SCENE.handles[0];
    if (handle === undefined) {
      throw new Error("fixture has no selected handle");
    }
    const knob = headingKnobAt(handle, TOLERANCE.headingArmM);
    if (knob === null) {
      throw new Error("fixture handle has no knob");
    }
    expect(
      resolveGrip(
        probe({
          selection: { kind: "handle", id: handle.id },
          at: handleBadgeAnchor(handle, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM),
        }),
      ),
    ).toBeNull();
    expect(
      resolveGrip(probe({ selection: { kind: "handle", id: handle.id }, at: knob })),
    ).toEqual({ kind: "rotate", id: handle.id, origin: { x: 0, y: 0 } });
    expect(resolveGrip(probe({ at: { x: 4, y: 0 } }))).toEqual({ kind: "handle", id: "h1" });
    expect(
      resolveGrip(
        probe({ selection: { kind: "area", id: "area" }, at: { x: 12, y: 10.1 } }),
      ),
    ).toEqual({
      kind: "insert-vertex",
      areaId: "area",
      edgeIndex: 0,
      at: { x: 12, y: 10 },
    });
    expect(
      resolveGrip(
        probe({
          selection: { kind: "area", id: "area" },
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02, badgeM: 0.01 },
        }),
      ),
    ).toEqual({ kind: "vertex", areaId: "area", index: 0 });
    expect(resolveGrip(probe({ at: { x: 2, y: 0.1 } }))).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 0,
      at: { x: 2, y: 0 },
    });
    expect(resolveGrip(probe({ at: { x: 12, y: 11 } }))).toBeNull();
    expect(resolveGrip(probe())).toBeNull();
  });

  it("[9] converts every grip using the release position", () => {
    const at = { x: 7, y: 8 };
    expect(resolveDragRelease({ kind: "handle", id: "h" }, at)).toEqual({
      kind: "move",
      id: "h",
      at,
    });
    expect(
      resolveDragRelease({ kind: "vertex", areaId: "a", index: 2 }, at),
    ).toEqual({ kind: "move-vertex", areaId: "a", index: 2, at });
    expect(
      resolveDragRelease({ kind: "insert", pathId: "p", afterIndex: 1, at: { x: 1, y: 1 } }, at),
    ).toEqual({ kind: "insert", pathId: "p", afterIndex: 1, at });
    expect(
      resolveDragRelease(
        { kind: "insert-vertex", areaId: "a", edgeIndex: 2, at: { x: 1, y: 1 } },
        at,
      ),
    ).toEqual({ kind: "insert-vertex", areaId: "a", edgeIndex: 2, at });
  });

  it("[9 / §4.1.11] computes rotate yaw from the origin frozen when the knob was pressed", () => {
    const grip: DragGrip = { kind: "rotate", id: "pose", origin: { x: 2, y: 3 } };
    expect(resolveDragRelease(grip, { x: 2, y: 8 })).toEqual({
      kind: "rotate",
      id: "pose",
      yaw: Math.PI / 2,
    });
    expect(resolveDragRelease(grip, { x: 1, y: 2 })).toEqual({
      kind: "rotate",
      id: "pose",
      yaw: -3 * Math.PI / 4,
    });
  });
});

describe("cursor vocabulary", () => {
  it("[10] maps direct affordances and never emits default", () => {
    const affordances: readonly [EditAffordance, string | undefined][] = [
      [{ kind: "handle", id: "h" }, "grab"],
      [{ kind: "vertex", areaId: "a", index: 0 }, "grab"],
      [{ kind: "knob", id: "h", at: { x: 0, y: 0 } }, "grab"],
      [{ kind: "ghost", pathId: "p", segmentIndex: 0, at: { x: 0, y: 0 } }, "copy"],
      [{ kind: "ghost-vertex", areaId: "a", edgeIndex: 0, at: { x: 0, y: 0 } }, "copy"],
      [
        { kind: "badge", target: { kind: "handle", id: "h" }, at: { x: 0, y: 0 } },
        "pointer",
      ],
      [{ kind: "area", id: "a" }, "pointer"],
      [{ kind: "floor" }, undefined],
      [{ kind: "none" }, undefined],
      [{ kind: "refused", reason: REFUSAL }, undefined],
    ];
    for (const [affordance, cursor] of affordances) {
      expect(cursorFor(affordance, false), affordance.kind).toBe(cursor);
      expect(cursorFor(affordance, false), affordance.kind).not.toBe("default");
      expect(cursorFor(affordance, true), `${affordance.kind} dragging`).toBe("grabbing");
    }
  });
});

describe("mode refusals", () => {
  it("[11] carries only an unsupported area mode's exact reason", () => {
    expect(modeRefusalsFor(SUPPORTED)).toEqual({});
    expect(modeRefusalsFor(UNSUPPORTED)).toEqual({ "draw-area": REFUSAL });
  });
});

describe("persistent coarse ghosts and open-path indexing", () => {
  it("[12 / §4.1.10] returns every resolved path-segment midpoint for coarse and none for fine", () => {
    expect(persistentGhosts(SCENE, "fine")).toEqual([]);
    expect(persistentGhosts(SCENE, "coarse")).toEqual([
      { pathId: "route", segmentIndex: 0, at: { x: 2, y: 0 } },
      { pathId: "route", segmentIndex: 1, at: { x: 4, y: 2 } },
    ]);
  });

  it("[13 / §4.1.3–4] clicks a path ghost as nothing but drags insert after its open-segment index", () => {
    const secondSegment = probe({ at: { x: 4.1, y: 2.5 } });
    expect(resolveAffordance(secondSegment)).toEqual({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 1,
      at: { x: 4, y: 2.5 },
    });
    expect(resolveClick(secondSegment)).toEqual({ kind: "nothing" });
    expect(resolveGrip(secondSegment)).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 1,
      at: { x: 4, y: 2.5 },
    });
    expect(
      resolveDragRelease(
        { kind: "insert", pathId: "route", afterIndex: 1, at: { x: 4, y: 2.5 } },
        { x: 5, y: 3 },
      ),
    ).toEqual({ kind: "insert", pathId: "route", afterIndex: 1, at: { x: 5, y: 3 } });
  });

  it("[13] never invents a last-to-first closing segment for a path", () => {
    expect(resolveAffordance(probe({ at: { x: 2, y: 2 } }))).toEqual({ kind: "floor" });
    expect(persistentGhosts(SCENE, "coarse")).not.toContainEqual({
      pathId: "route",
      segmentIndex: 2,
      at: { x: 2, y: 2 },
    });
  });
});
