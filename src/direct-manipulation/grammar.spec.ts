/**
 * @file Spec — the direct-manipulation intent kernel: a world-frame probe's
 * affordance, the thing a drag takes hold of, and the intent a click, a double
 * click or a release expresses.
 *
 * These cases pin the negative guarantees as directly as the positive grammar:
 * a fine click never removes anything, an unarmed object never exposes
 * deformable geometry, armed-mode drags belong to the camera, open paths never
 * acquire a synthetic closing segment, and a contradictory declaration is
 * refused rather than approximated.
 *
 * Three `describe` blocks carry the invariants' own words VERBATIM from
 * grammar.ts's header, and `spec/direct-manipulation-boundary.spec.ts` compares
 * the two texts statically. A reworded invariant therefore cannot keep a test
 * name that no longer describes it, and a renamed test cannot drift away from
 * the sentence it is supposed to hold.
 *
 * Two exhaustiveness accountings run over the TYPES rather than over a list
 * written here, so a new affordance kind, cursor name or intent kind fails this
 * spec until it is classified: "unclassified" is a gap, not an exclusion.
 */
import { describe, expect, it } from "vitest";
import {
  BADGE_ANCHOR_OFFSET_SCALE,
  COARSE_PICK_SCALE,
  DRAG_SLOP_PX,
  dragSlopPx,
  gripClassOf,
} from "./constants";
import {
  AREA_MUST_CLOSE,
  AREA_TOO_FEW,
  EDGE_NOT_A_SINGLE_LINE,
  EDIT_CURSOR_VALUES,
  EMPTY_SELECTION,
  cursorFor,
  isSelected,
  leafTargets,
  marqueeTargets,
  modeRefusalsFor,
  persistentGhosts,
  pruneSelection,
  resolveAffordance,
  resolveClick,
  resolveDoubleClick,
  resolveDragRelease,
  resolveGrip,
  resolveMoveSet,
  resolvePosition,
  revealedKnob,
  sameTarget,
  selectTargets,
  targetPosition,
  type DragGrip,
  type EditAffordance,
  type EditAnchors,
  type EditCapabilities,
  type EditCursorName,
  type EditIntent,
  type EditProbe,
  type EditPickClass,
  type EditScene,
  type EditScreenMarquee,
  type EditScreenRank,
  type EditSelection,
  type EditTarget,
  type EditTolerances,
} from "./grammar";
import { AXIS_STEP_RAD, YAW_STEP_RAD } from "./geometry";
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
  revealM: 3,
  snapM: 0.15,
};

const NAN_TOLERANCE: EditTolerances = {
  handleM: Number.NaN,
  ghostM: Number.NaN,
  knobM: Number.NaN,
  badgeM: Number.NaN,
  headingArmM: Number.NaN,
  revealM: Number.NaN,
  snapM: Number.NaN,
};

const NO_SNAP = { enabled: false, toGeometry: false, toGrid: false } as const;
const GEOMETRY_SNAP = { enabled: true, toGeometry: true, toGrid: false } as const;

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

const ROUTE: EditTarget = { kind: "path", id: "route" };
const AREA: EditTarget = { kind: "area", id: "area" };

/** A selection of exactly these targets, the last one primary (as G3 has it). */
function selected(...targets: readonly EditTarget[]): EditSelection {
  return selectTargets(EMPTY_SELECTION, targets, false);
}

function probe(overrides: Partial<EditProbe> = {}): EditProbe {
  return {
    mode: "direct",
    modality: "fine",
    scene: SCENE,
    selection: EMPTY_SELECTION,
    at: { x: 30, y: 30 },
    tolerance: TOLERANCE,
    capabilities: SUPPORTED,
    drawing: null,
    modifiers: { shift: false, alt: false },
    snapping: NO_SNAP,
    grid: null,
    ...overrides,
  };
}

/** A coarse probe: the same situation as read by a finger. */
function coarse(overrides: Partial<EditProbe> = {}): EditProbe {
  return probe({ modality: "coarse", ...overrides });
}

function withAlt(value: EditProbe): EditProbe {
  return { ...value, modifiers: { ...value.modifiers, alt: true } };
}

function withShift(value: EditProbe): EditProbe {
  return { ...value, modifiers: { ...value.modifiers, shift: true } };
}

function onlyKind(scene: EditScene, at: EditProbe["at"], tolerance: EditTolerances = TOLERANCE) {
  return probe({ scene, at, tolerance });
}

/** A screen frame that answers only for a candidate coincident with `target`. */
function proximityScreenRank(
  target: EditProbe["at"],
  seen: EditPickClass[] = [],
): EditScreenRank {
  return (klass, candidates, modality) => {
    seen.push(klass);
    expect(modality).toBe("fine");
    // A real host answers `reveal` with its own (much wider) arming radius; a
    // stub that measured it like a pick radius would gate every knob away.
    if (klass === "reveal") {
      return candidates.length === 0 ? null : { index: 0, distancePx: 0 };
    }
    const nearest = candidates
      .map((candidate, index) => ({
        index,
        distance: Math.hypot(candidate.x - target.x, candidate.y - target.y),
      }))
      .reduce(
        (best, candidate) => (candidate.distance < best.distance ? candidate : best),
        { index: -1, distance: Number.POSITIVE_INFINITY },
      );
    return nearest.distance <= 1e-6
      ? { index: nearest.index, distancePx: nearest.distance }
      : null;
  };
}

const ring = SCENE.areas[0]?.ring ?? [];
const firstHandle = SCENE.handles[0];
if (firstHandle === undefined) {
  throw new Error("fixture has no handle");
}
const badgeAnchorOf = (at: { x: number; y: number }) =>
  handleBadgeAnchor(at, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);

// ---------------------------------------------------------------------------
// The invariants, in their own words.
// ---------------------------------------------------------------------------

describe("Invariant A': in fine input a single click is non-destructive without exception (it selects, deselects, or does nothing), a double click is additive only (it inserts, never removes), and removal requires the Alt modifier, the host's chrome, or the host's native twin control; in coarse input the persistent delete badge stays the one click that removes.", () => {
  /**
   * Every affordance kind is accounted for here. The list is checked against
   * the kinds the grammar can actually PRODUCE (gathered from the situations
   * below plus the ones only reachable by construction), so a new kind cannot
   * slip in unclassified.
   */
  const situations: readonly {
    readonly name: string;
    readonly value: EditProbe;
    readonly affordance: EditAffordance["kind"];
    readonly click: EditIntent["kind"];
    readonly doubleClick: EditIntent["kind"];
  }[] = [
    {
      name: "unselected handle",
      value: probe({ at: { x: 4, y: 0 } }),
      affordance: "handle",
      click: "select-set",
      doubleClick: "nothing",
    },
    {
      name: "the selected handle itself",
      value: probe({ selection: selected({ kind: "handle", id: "h1" }), at: { x: 4, y: 0 } }),
      affordance: "handle",
      click: "deselect",
      doubleClick: "nothing",
    },
    {
      name: "heading knob",
      value: probe({
        selection: selected({ kind: "handle", id: "h0" }),
        at: headingKnobAt(firstHandle, TOLERANCE.headingArmM) ?? { x: 1, y: 0 },
      }),
      affordance: "knob",
      click: "nothing",
      doubleClick: "nothing",
    },
    {
      name: "armed path's edge",
      value: probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } }),
      affordance: "path-edge",
      click: "nothing",
      doubleClick: "insert",
    },
    {
      name: "armed path's edge with Alt",
      value: withAlt(probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } })),
      affordance: "ghost",
      click: "insert",
      doubleClick: "insert",
    },
    {
      name: "unarmed path's line",
      value: probe({ at: { x: 2, y: 0.1 } }),
      affordance: "path",
      click: "select-set",
      doubleClick: "nothing",
    },
    {
      name: "armed area's vertex",
      value: probe({
        selection: selected(AREA),
        at: { x: 10.1, y: 10.1 },
        tolerance: { ...TOLERANCE, ghostM: 0.02 },
      }),
      affordance: "vertex",
      click: "select-set",
      doubleClick: "nothing",
    },
    {
      name: "armed area's vertex with Alt",
      value: withAlt(
        probe({
          selection: selected(AREA),
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02 },
        }),
      ),
      affordance: "vertex",
      click: "delete-set",
      doubleClick: "nothing",
    },
    {
      name: "armed area's edge",
      value: probe({ selection: selected(AREA), at: { x: 12, y: 10.05 } }),
      affordance: "ring-edge",
      click: "nothing",
      doubleClick: "insert-vertex",
    },
    {
      name: "armed area's edge with Alt",
      value: withAlt(probe({ selection: selected(AREA), at: { x: 12, y: 10.05 } })),
      affordance: "ghost-vertex",
      click: "insert-vertex",
      doubleClick: "insert-vertex",
    },
    {
      name: "unselected area interior",
      value: probe({ at: { x: 12, y: 11 } }),
      affordance: "area",
      click: "select-set",
      doubleClick: "nothing",
    },
    {
      name: "the selected area's interior",
      value: probe({ selection: selected(AREA), at: { x: 12, y: 11.5 } }),
      affordance: "area",
      click: "deselect",
      doubleClick: "nothing",
    },
    {
      name: "empty floor",
      value: probe(),
      affordance: "floor",
      click: "deselect",
      doubleClick: "nothing",
    },
    {
      name: "a handle with Alt",
      value: withAlt(probe({ at: { x: 4, y: 0 } })),
      affordance: "handle",
      click: "delete-set",
      doubleClick: "nothing",
    },
    {
      name: "run's first point while drawing an area",
      value: probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 1.05, y: 1 } }),
      affordance: "run-first",
      click: "close-ring",
      doubleClick: "refused",
    },
    {
      name: "run's last point while appending",
      value: probe({
        mode: "append",
        drawing: [{ x: 1, y: 1 }, { x: 5, y: 5 }],
        at: { x: 5.05, y: 5 },
      }),
      affordance: "run-last",
      click: "finish-run",
      doubleClick: "finish-run",
    },
    {
      name: "an existing path's end while append is armed with no run",
      value: probe({ mode: "append", drawing: null, at: { x: 0.05, y: 0 } }),
      affordance: "path-endpoint",
      click: "resume-drawing",
      doubleClick: "finish-run",
    },
    {
      name: "armed floor",
      value: probe({ mode: "append", drawing: null, at: { x: 30, y: 30 } }),
      affordance: "floor",
      click: "place",
      doubleClick: "finish-run",
    },
    {
      name: "a refused capability",
      value: probe({ mode: "draw-area", capabilities: UNSUPPORTED, at: { x: 30, y: 30 } }),
      affordance: "refused",
      click: "refused",
      doubleClick: "refused",
    },
    {
      name: "a contradictory grid declaration",
      value: probe({ snapping: { enabled: true, toGeometry: false, toGrid: true }, grid: null }),
      affordance: "refused",
      click: "refused",
      doubleClick: "refused",
    },
  ];

  it("resolves each situation to the affordance and the intents it declares", () => {
    for (const situation of situations) {
      expect(resolveAffordance(situation.value).kind, situation.name).toBe(situation.affordance);
      expect(resolveClick(situation.value).kind, `${situation.name} click`).toBe(situation.click);
      expect(
        resolveDoubleClick(situation.value).kind,
        `${situation.name} double click`,
      ).toBe(situation.doubleClick);
    }
  });

  it("accounts for every affordance kind the type declares (unclassified = fail)", () => {
    // The type's kinds, enumerated from a total record: adding a kind to
    // EditAffordance without adding it here is a compile error, and leaving it
    // out of the table above fails the assertion.
    const ACCOUNTED: Readonly<Record<EditAffordance["kind"], "covered" | "by-construction">> = {
      none: "by-construction",
      handle: "covered",
      badge: "by-construction",
      knob: "covered",
      ghost: "covered",
      "ghost-vertex": "covered",
      "path-edge": "covered",
      "ring-edge": "covered",
      vertex: "covered",
      area: "covered",
      path: "covered",
      "run-first": "covered",
      "run-last": "covered",
      "path-endpoint": "covered",
      floor: "covered",
      refused: "covered",
    };
    const covered = new Set(situations.map((situation) => situation.affordance));
    const missing = Object.entries(ACCOUNTED)
      .filter(([kind, how]) => how === "covered" && !covered.has(kind as EditAffordance["kind"]))
      .map(([kind]) => kind);
    expect(missing, {
      message:
        `These affordance kinds are declared "covered" but no situation above produces ` +
        `them: ${missing.join(", ")}.`,
    } as never).toEqual([]);
    // `none` is the pointer being off the surface entirely (the hook's state,
    // not a probe answer); `badge` is coarse-only and is covered by the coarse
    // block below.
    expect(covered.has("badge")).toBe(false);
  });

  it("never removes anything on a fine single click without Alt", () => {
    const destructive = situations.filter(
      (situation) =>
        situation.value.modifiers.alt === false && situation.click === "delete-set",
    );
    expect(destructive.map((situation) => situation.name)).toEqual([]);
  });

  it("never removes anything on a double click, with or without Alt", () => {
    for (const situation of situations) {
      expect(resolveDoubleClick(situation.value).kind, situation.name).not.toBe("delete-set");
      expect(
        resolveDoubleClick(withAlt(situation.value)).kind,
        `${situation.name} with Alt`,
      ).not.toBe("delete-set");
    }
  });

  it("has no delete badge at all in fine input - absence, not a smaller radius", () => {
    // Every position around a selected handle: with a fine pointer none of them
    // is a badge, so the anchor-offset workaround has nothing to defend against.
    const anchor = badgeAnchorOf(firstHandle);
    const around = [
      anchor,
      { x: anchor.x + 0.05, y: anchor.y },
      { x: anchor.x - 0.05, y: anchor.y },
      { x: anchor.x, y: anchor.y + 0.05 },
    ];
    for (const at of around) {
      const value = probe({ selection: selected({ kind: "handle", id: "h0" }), at });
      expect(resolveAffordance(value).kind).not.toBe("badge");
      expect(resolveClick(value).kind).not.toBe("delete-set");
    }
  });

  it("keeps the coarse badge as the one tap that removes, at its 2x anchor", () => {
    const handleBadge = probe({
      modality: "coarse",
      selection: selected({ kind: "handle", id: "h0" }),
      at: badgeAnchorOf(firstHandle),
    });
    expect(resolveAffordance(handleBadge)).toEqual({
      kind: "badge",
      target: { kind: "handle", id: "h0" },
      at: badgeAnchorOf(firstHandle),
    });
    expect(resolveClick(handleBadge)).toEqual({
      kind: "delete-set",
      targets: [{ kind: "handle", id: "h0" }],
    });

    // The 2x offset still keeps the badge's disc off its own target's centre,
    // so tapping the selected thing itself is deselect and never delete.
    const centre = probe({
      modality: "coarse",
      selection: selected({ kind: "handle", id: "h1" }),
      at: { x: 4, y: 0 },
    });
    expect(resolveAffordance(centre)).toEqual({ kind: "handle", id: "h1" });
    expect(resolveClick(centre)).toEqual({ kind: "deselect" });
  });

  it("removes an area and a ring vertex through their coarse badges", () => {
    const areaBadge = areaBadgeAnchor(ring, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    expect(
      resolveClick(coarse({ selection: selected(AREA), at: areaBadge })),
    ).toEqual({ kind: "delete-set", targets: [AREA] });

    const vertexBadge = badgeAnchorOf(ring[0] ?? { x: 10, y: 10 });
    expect(
      resolveClick(coarse({ selection: selected(AREA), at: vertexBadge })),
    ).toEqual({
      kind: "delete-set",
      targets: [{ kind: "vertex", areaId: "area", index: 0 }],
    });
  });

  it("has no double-click semantics in coarse input at all, declared rather than unhandled", () => {
    // A double tap is the browser's zoom gesture; competing with it would make
    // both unreliable, so the grammar states that it means nothing here.
    for (const situation of situations) {
      expect(
        resolveDoubleClick({ ...situation.value, modality: "coarse" }).kind,
        situation.name,
      ).toBe("nothing");
    }
  });
});

describe("Invariant D: an armed mode's drag always belongs to the camera, and a grip is the only thing that locks it.", () => {
  it("gives every append and draw-area drag to the camera", () => {
    for (const mode of ["append", "draw-area"] as const) {
      for (const modifiers of [
        { shift: false, alt: false },
        { shift: true, alt: false },
        { shift: false, alt: true },
      ]) {
        expect(
          resolveGrip(probe({ mode, modifiers, at: { x: 0, y: 0 } })),
          `${mode} ${JSON.stringify(modifiers)}`,
        ).toBeNull();
      }
    }
  });

  it("gives an armed drag to the camera even over a handle, a run end or a path end", () => {
    const positions = [
      { name: "over a handle", at: { x: 4, y: 0 } },
      { name: "over a run end", at: { x: 5, y: 5 } },
      { name: "over an armed path's line", at: { x: 2, y: 0 } },
    ];
    for (const position of positions) {
      expect(
        resolveGrip(
          probe({
            mode: "append",
            selection: selected(ROUTE),
            drawing: [{ x: 1, y: 1 }, { x: 5, y: 5 }],
            at: position.at,
          }),
        ),
        position.name,
      ).toBeNull();
    }
  });

  it("takes no grip from a badge, a run end, an unarmed path or the floor", () => {
    const noGrip: readonly { readonly name: string; readonly value: EditProbe }[] = [
      {
        name: "coarse badge (click-only)",
        value: coarse({
          selection: selected({ kind: "handle", id: "h0" }),
          at: badgeAnchorOf(firstHandle),
        }),
      },
      { name: "unarmed path's line", value: probe({ at: { x: 2, y: 0.1 } }) },
      { name: "unselected area interior", value: probe({ at: { x: 12, y: 11 } }) },
      { name: "empty floor", value: probe() },
    ];
    for (const entry of noGrip) {
      expect(resolveGrip(entry.value), entry.name).toBeNull();
    }
  });

  it("maps every grippable affordance to its grip class", () => {
    const grips: readonly { readonly name: string; readonly value: EditProbe; readonly grip: DragGrip["kind"] }[] = [
      {
        name: "handle",
        value: probe({ at: { x: 4, y: 0 } }),
        grip: "move-set",
      },
      {
        name: "knob",
        value: probe({
          selection: selected({ kind: "handle", id: "h0" }),
          at: headingKnobAt(firstHandle, TOLERANCE.headingArmM) ?? { x: 1, y: 0 },
        }),
        grip: "rotate",
      },
      {
        name: "armed path edge (parallel translate)",
        value: probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } }),
        grip: "move-set",
      },
      {
        name: "armed path edge with Alt (insert)",
        value: withAlt(probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } })),
        grip: "insert",
      },
      {
        name: "armed ring edge (parallel translate)",
        value: probe({ selection: selected(AREA), at: { x: 12, y: 10.05 } }),
        grip: "move-set",
      },
      {
        name: "armed ring edge with Alt (insert)",
        value: withAlt(probe({ selection: selected(AREA), at: { x: 12, y: 10.05 } })),
        grip: "insert-vertex",
      },
      {
        name: "armed ring vertex",
        value: probe({
          selection: selected(AREA),
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02 },
        }),
        grip: "move-set",
      },
      {
        name: "the selected area's interior",
        value: probe({ selection: selected(AREA), at: { x: 12, y: 11.5 } }),
        grip: "move-set",
      },
      {
        name: "Shift on empty floor",
        value: withShift(probe()),
        grip: "marquee",
      },
      {
        name: "Shift on an unarmed path",
        value: withShift(probe({ at: { x: 2, y: 0.1 } })),
        grip: "marquee",
      },
    ];
    const seen = new Set<DragGrip["kind"]>();
    for (const entry of grips) {
      const grip = resolveGrip(entry.value);
      expect(grip?.kind ?? null, entry.name).toBe(entry.grip);
      if (grip !== null) {
        seen.add(grip.kind);
        expect(DRAG_SLOP_PX[gripClassOf(grip)], entry.name).toBeDefined();
      }
    }
    // Accounting over the type: every grip kind is exercised above.
    const ALL_GRIPS: Readonly<Record<DragGrip["kind"], true>> = {
      "move-set": true,
      insert: true,
      "insert-vertex": true,
      rotate: true,
      marquee: true,
    };
    expect([...Object.keys(ALL_GRIPS)].filter((kind) => !seen.has(kind as DragGrip["kind"]))).toEqual(
      [],
    );
  });

  it("gives each grip class its own slop, coarse wider than fine except the marquee", () => {
    const move: DragGrip = { kind: "move-set", members: [], origin: { x: 0, y: 0 } };
    const rotate: DragGrip = { kind: "rotate", id: "h0", origin: { x: 0, y: 0 } };
    expect(dragSlopPx(rotate, "fine")).toBeLessThan(dragSlopPx(move, "fine"));
    expect(dragSlopPx(move, "coarse")).toBeGreaterThan(dragSlopPx(move, "fine"));
    // The marquee is a fine gesture (it needs Shift), so its threshold does not
    // widen for a finger.
    expect(DRAG_SLOP_PX.marquee.coarse).toBe(DRAG_SLOP_PX.marquee.fine);
  });
});

describe("Invariant F': a deformable sub-element (a ring vertex, a ring edge, a path segment) is a candidate only while its owning object is in the selection, and an unarmed object offers nothing except the affordance that selects it; fine input alone is armed this way, because coarse input has no hover with which to arm anything.", () => {
  it("offers an unarmed path only the affordance that selects it", () => {
    const nearSegment = probe({ at: { x: 2, y: 0.1 } });
    expect(resolveAffordance(nearSegment)).toEqual({ kind: "path", id: "route" });
    // This is the whole fix for "the mouse gets in the way": a press here used
    // to take an insert grip, so a camera drag near an unselected route grew a
    // vertex.
    expect(resolveGrip(nearSegment)).toBeNull();
    expect(resolveClick(nearSegment)).toEqual({
      kind: "select-set",
      targets: [ROUTE],
      additive: false,
    });
  });

  it("offers an unarmed area only its interior, never its vertices or edges", () => {
    const nearVertex = probe({ at: { x: 10.1, y: 10.1 } });
    const nearEdge = probe({ at: { x: 12, y: 10.05 } });
    expect(resolveAffordance(nearVertex)).toEqual({ kind: "area", id: "area" });
    expect(resolveAffordance(nearEdge)).toEqual({ kind: "area", id: "area" });
    expect(resolveGrip(nearVertex)).toBeNull();
    expect(resolveGrip(nearEdge)).toBeNull();
  });

  it("arms an object through the object itself or through any of its parts", () => {
    const armings: readonly { readonly name: string; readonly selection: EditSelection }[] = [
      { name: "the path itself", selection: selected(ROUTE) },
      { name: "one of its handles", selection: selected({ kind: "handle", id: "h1" }) },
    ];
    for (const arming of armings) {
      expect(
        resolveAffordance(probe({ selection: arming.selection, at: { x: 2, y: 0.1 } })).kind,
        arming.name,
      ).toBe("path-edge");
    }

    const areaArmings: readonly { readonly name: string; readonly selection: EditSelection }[] = [
      { name: "the area itself", selection: selected(AREA) },
      {
        name: "one of its vertices",
        selection: selected({ kind: "vertex", areaId: "area", index: 2 }),
      },
    ];
    for (const arming of areaArmings) {
      expect(
        resolveAffordance(probe({ selection: arming.selection, at: { x: 12, y: 10.05 } })).kind,
        arming.name,
      ).toBe("ring-edge");
    }
  });

  it("arms one object without arming its neighbour", () => {
    const twoPaths: EditScene = {
      handles: [
        { id: "a0", x: 0, y: 0 },
        { id: "a1", x: 4, y: 0 },
        { id: "b0", x: 0, y: 8 },
        { id: "b1", x: 4, y: 8 },
      ],
      paths: [
        { id: "armed", handleIds: ["a0", "a1"] },
        { id: "other", handleIds: ["b0", "b1"] },
      ],
      areas: [],
    };
    const selection = selected({ kind: "path", id: "armed" });
    expect(
      resolveAffordance(probe({ scene: twoPaths, selection, at: { x: 2, y: 0.1 } })),
    ).toMatchObject({ kind: "path-edge", pathId: "armed" });
    expect(
      resolveAffordance(probe({ scene: twoPaths, selection, at: { x: 2, y: 8.1 } })),
    ).toEqual({ kind: "path", id: "other" });
  });

  it("does not arm coarse input: every path keeps its persistent ghosts", () => {
    // Coarse has no hover, so arming would make the affordance vanish rather
    // than declutter. This modality split is the same one persistentGhosts
    // already declared.
    const unarmed = coarse({ at: { x: 2, y: 0.1 } });
    expect(resolveAffordance(unarmed)).toEqual({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 0,
      at: { x: 2, y: 0 },
    });
    expect(resolveGrip(unarmed)).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 0,
      at: { x: 2, y: 0 },
    });
    expect(persistentGhosts(SCENE, "coarse")).toEqual([
      { pathId: "route", segmentIndex: 0, at: { x: 2, y: 0 } },
      { pathId: "route", segmentIndex: 1, at: { x: 4, y: 2 } },
    ]);
    expect(persistentGhosts(SCENE, "fine")).toEqual([]);
  });

  it("keeps the coarse ring rule exactly as it was: selected area only", () => {
    expect(resolveAffordance(coarse({ at: { x: 10.1, y: 10.1 } }))).toEqual({
      kind: "area",
      id: "area",
    });
    expect(
      resolveAffordance(
        coarse({
          selection: selected(AREA),
          at: { x: 10.1, y: 10.1 },
          tolerance: { ...TOLERANCE, ghostM: 0.02, badgeM: 0.01 },
        }),
      ).kind,
    ).toBe("vertex");
  });

  it("never invents a last-to-first closing segment for a path", () => {
    expect(resolveAffordance(probe({ selection: selected(ROUTE), at: { x: 2, y: 2 } }))).toEqual({
      kind: "floor",
    });
    expect(persistentGhosts(SCENE, "coarse")).not.toContainEqual({
      pathId: "route",
      segmentIndex: 2,
      at: { x: 2, y: 2 },
    });
  });

  it("resolves path handle ids in order, skips missing ids, and drops paths with fewer than two points", () => {
    expect(
      resolveAffordance(probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } })),
    ).toMatchObject({ kind: "path-edge", pathId: "route", segmentIndex: 0 });
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

// ---------------------------------------------------------------------------
// Priority: distance across point classes, structure between point and line.
// ---------------------------------------------------------------------------

describe("affordance priority", () => {
  const overlapRing = SCENE.areas[0];
  if (overlapRing === undefined) {
    throw new Error("fixture has no area");
  }

  it("[v1.1] keeps a point above a line: a vertex lies on its own edges", () => {
    // The reverse order would make every corner unreachable, because the edge
    // hit is distance zero at the vertex itself. This is the discovery the
    // previous revision recorded, and it does not change.
    const value = probe({
      scene: {
        handles: [
          { id: "path-a", x: 9, y: 10.1 },
          { id: "path-b", x: 11, y: 10.1 },
        ],
        paths: [{ id: "through-vertex", handleIds: ["path-a", "path-b"] }],
        areas: [overlapRing],
      },
      selection: selected(AREA, { kind: "path", id: "through-vertex" }),
      at: { x: 10.1, y: 10.1 },
      tolerance: { ...TOLERANCE, ghostM: 0.1 },
    });
    expect(resolveAffordance(value).kind).toBe("vertex");
  });

  it("arbitrates point classes by DISTANCE, so a knob no longer shadows a neighbour", () => {
    // The defect this replaces: the knob sat at the end of its arm and won by
    // fixed priority, so a waypoint under it could not be grabbed at all.
    const scene: EditScene = {
      handles: [
        { id: "selected", x: 11.5, y: 11, yaw: 0 },
        // Close enough to the knob (at 12, 11) that both are always in
        // tolerance - which is exactly the situation the old fixed order lost.
        { id: "neighbour", x: 12.15, y: 11 },
      ],
      paths: [],
      areas: [],
    };
    const selection = selected({ kind: "handle", id: "selected" });
    const tolerance = { ...TOLERANCE, headingArmM: 0.5 };

    // Dead centre on the knob: the knob wins.
    expect(
      resolveAffordance(probe({ scene, selection, tolerance, at: { x: 12, y: 11 } })).kind,
    ).toBe("knob");
    // Nearer the neighbour than the knob: the neighbour is reachable, which
    // under the old fixed order it never was.
    expect(
      resolveAffordance(probe({ scene, selection, tolerance, at: { x: 12.12, y: 11 } })),
    ).toEqual({ kind: "handle", id: "neighbour" });
  });

  it("arbitrates the coarse badge by distance too, so it cannot shield a nearer handle", () => {
    const anchor = badgeAnchorOf({ x: 0, y: 0 });
    const scene: EditScene = {
      handles: [
        { id: "selected", x: 0, y: 0 },
        { id: "under-badge", x: anchor.x + 0.02, y: anchor.y },
      ],
      paths: [],
      areas: [],
    };
    const selection = selected({ kind: "handle", id: "selected" });
    // Right on the badge: the badge wins.
    expect(
      resolveAffordance(coarse({ scene, selection, at: anchor })).kind,
    ).toBe("badge");
    // Nearer the neighbour: the neighbour wins, and the delete does not fire.
    const nearer = { x: anchor.x + 0.03, y: anchor.y };
    expect(resolveAffordance(coarse({ scene, selection, at: nearer }))).toEqual({
      kind: "handle",
      id: "under-badge",
    });
  });

  it("breaks exact ties deterministically: badge, knob, run ends, handle, vertex", () => {
    const coincident: EditScene = {
      handles: [
        { id: "selected", x: 0, y: 0, yaw: 0 },
        { id: "coincident", x: 1, y: 0 },
      ],
      paths: [],
      areas: [],
    };
    // Knob (at the arm's end, 1 m away) and a handle occupy the same point.
    expect(
      resolveAffordance(
        probe({
          scene: coincident,
          selection: selected({ kind: "handle", id: "selected" }),
          at: { x: 1, y: 0 },
        }),
      ).kind,
    ).toBe("knob");

    // A run's first and last point coincide when the run has one point: closing
    // wins over finishing, which is what an area needs.
    expect(
      resolveAffordance(
        probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 1, y: 1 } }),
      ).kind,
    ).toBe("run-first");
  });

  it("evaluates line classes in arming order: ring edge, then path segment, then interior", () => {
    const insideScene: EditScene = {
      handles: [
        { id: "inside-a", x: 11, y: 11 },
        { id: "inside-b", x: 13, y: 11 },
      ],
      paths: [{ id: "inside", handleIds: ["inside-a", "inside-b"] }],
      areas: [overlapRing],
    };
    // An armed path's segment beats the area interior it crosses.
    expect(
      resolveAffordance(
        probe({
          scene: insideScene,
          selection: selected({ kind: "path", id: "inside" }),
          at: { x: 12, y: 11 },
        }),
      ).kind,
    ).toBe("path-edge");
    // With nothing armed, the interior answers.
    expect(resolveAffordance(probe({ scene: { ...SCENE, paths: [] }, at: { x: 12, y: 11 } }))).toEqual(
      { kind: "area", id: "area" },
    );
  });

  it("uses the contracted world anchors for the badge, the knob and edge points", () => {
    const areaBadge = areaBadgeAnchor(ring, BADGE_ANCHOR_OFFSET_SCALE * TOLERANCE.badgeM);
    expect(resolveAffordance(coarse({ selection: selected(AREA), at: areaBadge }))).toEqual({
      kind: "badge",
      target: AREA,
      at: areaBadge,
    });

    const knob = headingKnobAt(firstHandle, TOLERANCE.headingArmM);
    if (knob === null) {
      throw new Error("fixture handle has no heading knob");
    }
    expect(
      resolveAffordance(
        probe({ selection: selected({ kind: "handle", id: "h0" }), at: knob }),
      ),
    ).toEqual({ kind: "knob", id: "h0", at: knob });

    expect(
      resolveAffordance(probe({ selection: selected(ROUTE), at: { x: 1.25, y: 0.1 } })),
    ).toEqual({ kind: "path-edge", pathId: "route", segmentIndex: 0, at: { x: 1.25, y: 0 } });
    expect(
      resolveAffordance(probe({ selection: selected(AREA), at: { x: 11.25, y: 10.1 } })),
    ).toEqual({ kind: "ring-edge", areaId: "area", edgeIndex: 0, at: { x: 11.25, y: 10 } });
  });

  it("reveals the heading knob only once the pointer has approached its handle", () => {
    // Nothing floats beside a precise gesture the operator has not made. This
    // is the DRAWING answer as much as the picking one - a host draws the knob
    // from `revealedKnob` and not from "something is selected", which is what
    // used to put a rotation target next to every neighbouring waypoint.
    const selection = selected({ kind: "handle", id: "h0" });
    const knobAt = headingKnobAt(firstHandle, TOLERANCE.headingArmM);
    if (knobAt === null) {
      throw new Error("fixture handle has no heading knob");
    }

    // Far from the handle: nothing is drawn, and nothing can be picked either.
    const away = probe({ selection, at: { x: 20, y: 20 } });
    expect(revealedKnob(away)).toBeNull();
    expect(resolveAffordance(away).kind).not.toBe("knob");

    // Within the arming radius of the handle: revealed.
    const near = probe({ selection, at: { x: 0.5, y: 0 } });
    expect(revealedKnob(near)).toEqual({ id: "h0", at: knobAt });
    // And on the knob itself it is what the press takes hold of.
    expect(resolveAffordance(probe({ selection, at: knobAt })).kind).toBe("knob");

    // Coarse input has no hover with which to approach, so it is never gated.
    expect(revealedKnob(coarse({ selection, at: { x: 20, y: 20 } }))).toEqual({
      id: "h0",
      at: knobAt,
    });
  });

  it("reveals no knob for a primary that is not a handle, or has no heading", () => {
    expect(revealedKnob(probe({ selection: selected(AREA), at: { x: 12, y: 11 } }))).toBeNull();
    // h1 carries no yaw, so it has no heading to rotate.
    expect(
      revealedKnob(probe({ selection: selected({ kind: "handle", id: "h1" }), at: { x: 4, y: 0 } })),
    ).toBeNull();
    expect(revealedKnob(probe())).toBeNull();
  });

  it("shows the knob for the primary only, however many targets are selected", () => {
    const scene: EditScene = {
      handles: [
        { id: "first", x: 0, y: 0, yaw: 0 },
        { id: "second", x: 6, y: 0, yaw: 0 },
      ],
      paths: [],
      areas: [],
    };
    const selection = selectTargets(
      EMPTY_SELECTION,
      [
        { kind: "handle", id: "first" },
        { kind: "handle", id: "second" },
      ],
      false,
    );
    expect(selection.primary).toEqual({ kind: "handle", id: "second" });
    // The primary's knob is there...
    expect(
      resolveAffordance(probe({ scene, selection, at: { x: 7, y: 0 } })).kind,
    ).toBe("knob");
    // ...and the other member's is not.
    expect(
      resolveAffordance(probe({ scene, selection, at: { x: 1, y: 0 } })).kind,
    ).not.toBe("knob");
  });
});

// ---------------------------------------------------------------------------
// The v0.16.0 regression baselines, split by modality and both pinned.
// ---------------------------------------------------------------------------

describe("v0.16.0 baselines - coarse answers are unchanged", () => {
  it("keeps the representative handle, path-ghost and badge answers from v0.16.0", () => {
    const handleProbe = coarse({ at: { x: 4, y: 0 } });
    expect(resolveAffordance(handleProbe)).toEqual({ kind: "handle", id: "h1" });
    expect(resolveClick(handleProbe)).toEqual({
      kind: "select-set",
      targets: [{ kind: "handle", id: "h1" }],
      additive: false,
    });

    const ghostProbe = coarse({ at: { x: 2, y: 0.1 } });
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

    const badgeAt = badgeAnchorOf(firstHandle);
    const badgeProbe = coarse({
      selection: selected({ kind: "handle", id: "h0" }),
      at: badgeAt,
    });
    expect(resolveAffordance(badgeProbe)).toEqual({
      kind: "badge",
      target: { kind: "handle", id: "h0" },
      at: badgeAt,
    });
    expect(resolveClick(badgeProbe)).toEqual({
      kind: "delete-set",
      targets: [{ kind: "handle", id: "h0" }],
    });
  });

  it("multiplies every coarse pick radius by COARSE_PICK_SCALE, as before", () => {
    expect(COARSE_PICK_SCALE).toBe(1.6);
    const small: EditTolerances = {
      handleM: 0.2,
      ghostM: 0.2,
      knobM: 0.2,
      badgeM: 0.01,
      headingArmM: 1,
      revealM: 3,
      snapM: 0.1,
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
    const badgeAnchor = handleBadgeAnchor(
      { x: 0, y: 0 },
      BADGE_ANCHOR_OFFSET_SCALE * badgeTolerance.badgeM,
    );
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
          selection: selected(AREA),
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
        name: "ghostM for selected-ring edges",
        value: probe({
          scene: { handles: [], paths: [], areas: SCENE.areas },
          selection: selected(AREA),
          at: { x: 12, y: 9.7 },
          tolerance: small,
        }),
        coarseKind: "ghost-vertex",
      },
      {
        name: "knobM for heading knobs",
        value: probe({
          scene: knobScene,
          selection: selected({ kind: "handle", id: "pose" }),
          at: { x: 1, y: 0.3 },
          tolerance: small,
        }),
        coarseKind: "knob",
      },
      {
        name: "badgeM for delete badges",
        value: probe({
          scene: { handles: [{ id: "badged", x: 0, y: 0 }], paths: [], areas: [] },
          selection: selected({ kind: "handle", id: "badged" }),
          at: {
            x: badgeAnchor.x + 0.3 * Math.SQRT1_2,
            y: badgeAnchor.y + 0.3 * Math.SQRT1_2,
          },
          tolerance: badgeTolerance,
        }),
        coarseKind: "badge",
      },
    ];

    for (const entry of cases) {
      // Just out of reach for a fine pointer...
      const fineKind = resolveAffordance(entry.value).kind;
      expect(["floor", "area", "path"], `${entry.name} fine`).toContain(fineKind);
      // ...and within reach for a finger.
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

describe("v0.16.0 baselines - the fine answers that changed, and why", () => {
  it("answers `path` where v0.16.0 answered `ghost` for an unarmed route", () => {
    expect(resolveAffordance(probe({ at: { x: 2, y: 0.1 } }))).toEqual({
      kind: "path",
      id: "route",
    });
  });

  it("answers `path-edge` where v0.16.0 answered `ghost` for an armed route", () => {
    expect(
      resolveAffordance(probe({ selection: selected(ROUTE), at: { x: 2, y: 0.1 } })),
    ).toEqual({ kind: "path-edge", pathId: "route", segmentIndex: 0, at: { x: 2, y: 0 } });
  });

  it("answers anything but `badge` where v0.16.0 answered `badge`", () => {
    const badgeAt = badgeAnchorOf(firstHandle);
    expect(
      resolveAffordance(probe({ selection: selected({ kind: "handle", id: "h0" }), at: badgeAt }))
        .kind,
    ).not.toBe("badge");
  });
});

// ---------------------------------------------------------------------------
// The screen-space frame.
// ---------------------------------------------------------------------------

describe("screen-space frame delegation", () => {
  const anchors: EditAnchors = {
    knobAt: () => ({ x: 50, y: 50 }),
    badgeAt: () => ({ x: 60, y: 60 }),
  };

  it("resolves handle, edge, knob, badge and vertex with NaN metric tolerances", () => {
    const handleTarget = { x: 3, y: 4 };
    expect(
      resolveAffordance(
        probe({
          scene: { handles: [{ id: "screen-handle", x: 3, y: 4 }], paths: [], areas: [] },
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenRank: proximityScreenRank(handleTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "handle", id: "screen-handle" });

    const edgeTarget = { x: 5, y: 0 };
    expect(
      resolveAffordance(
        probe({
          scene: {
            handles: [
              { id: "edge-start", x: 0, y: 0 },
              { id: "edge-end", x: 10, y: 0 },
            ],
            paths: [{ id: "screen-path", handleIds: ["edge-start", "edge-end"] }],
            areas: [],
          },
          selection: selected({ kind: "path", id: "screen-path" }),
          at: { x: 5, y: 2 },
          tolerance: NAN_TOLERANCE,
          screenRank: proximityScreenRank(edgeTarget),
          anchors,
        }),
      ),
    ).toEqual({
      kind: "path-edge",
      pathId: "screen-path",
      segmentIndex: 0,
      at: edgeTarget,
    });

    const knobTarget = { x: 50, y: 50 };
    expect(
      resolveAffordance(
        probe({
          scene: { handles: [{ id: "screen-knob", x: 0, y: 0, yaw: 0 }], paths: [], areas: [] },
          selection: selected({ kind: "handle", id: "screen-knob" }),
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenRank: proximityScreenRank(knobTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "knob", id: "screen-knob", at: knobTarget });

    const badgeTarget = { x: 60, y: 60 };
    expect(
      resolveAffordance(
        coarse({
          scene: { handles: [{ id: "screen-badge", x: 0, y: 0 }], paths: [], areas: [] },
          selection: selected({ kind: "handle", id: "screen-badge" }),
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenRank: (klass, candidates) =>
            klass === "badge" && candidates.length > 0 ? { index: 0, distancePx: 0 } : null,
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
          scene: {
            handles: [],
            paths: [],
            areas: [
              {
                id: "screen-area",
                ring: [
                  { x: 10, y: 10 },
                  { x: 14, y: 10 },
                  { x: 12, y: 14 },
                ],
              },
            ],
          },
          selection: selected({ kind: "area", id: "screen-area" }),
          at: { x: -30, y: -30 },
          tolerance: NAN_TOLERANCE,
          screenRank: proximityScreenRank(vertexTarget),
          anchors,
        }),
      ),
    ).toEqual({ kind: "vertex", areaId: "screen-area", index: 0 });
  });

  it("honours the host's answer over a metrically nearer candidate", () => {
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
          screenRank: proximityScreenRank(authoritative),
        }),
      ),
    ).toEqual({ kind: "handle", id: "screen-authoritative" });
  });

  it("uses the host's px distance to arbitrate ACROSS classes", () => {
    // The reason screenPick had to become screenRank: an index alone cannot
    // settle "which class is nearer" in the host's own frame.
    const scene: EditScene = {
      handles: [
        { id: "selected", x: 0, y: 0, yaw: 0 },
        { id: "neighbour", x: 5, y: 0 },
      ],
      paths: [],
      areas: [],
    };
    const selection = selected({ kind: "handle", id: "selected" });
    const rankWith = (knobPx: number, handlePx: number): EditScreenRank =>
      (klass, candidates) => {
        if (candidates.length === 0) {
          return null;
        }
        if (klass === "reveal") {
          return { index: 0, distancePx: 0 };
        }
        if (klass === "knob") {
          return { index: 0, distancePx: knobPx };
        }
        if (klass === "handle") {
          return { index: 1, distancePx: handlePx };
        }
        return null;
      };
    expect(
      resolveAffordance(
        probe({ scene, selection, tolerance: NAN_TOLERANCE, screenRank: rankWith(3, 9) }),
      ).kind,
    ).toBe("knob");
    expect(
      resolveAffordance(
        probe({ scene, selection, tolerance: NAN_TOLERANCE, screenRank: rankWith(9, 3) }),
      ),
    ).toEqual({ kind: "handle", id: "neighbour" });
  });

  it("rejects a nonsensical answer instead of trusting it", () => {
    const scene: EditScene = { handles: [{ id: "h", x: 0, y: 0 }], paths: [], areas: [] };
    const bad: readonly EditScreenRank[] = [
      () => ({ index: 1.5, distancePx: 1 }),
      () => ({ index: -1, distancePx: 1 }),
      () => ({ index: 5, distancePx: 1 }),
      () => ({ index: 0, distancePx: Number.NaN }),
      () => ({ index: 0, distancePx: -1 }),
    ];
    for (const screenRank of bad) {
      expect(
        resolveAffordance(probe({ scene, at: { x: 0, y: 0 }, tolerance: NAN_TOLERANCE, screenRank })),
      ).toEqual({ kind: "floor" });
    }
  });

  it("returns floor and deselects when no frame is declared and every tolerance is NaN", () => {
    const cases: readonly EditProbe[] = [
      probe({
        scene: { handles: [{ id: "handle", x: 0, y: 0 }], paths: [], areas: [] },
        at: { x: 0, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: {
          handles: [
            { id: "edge-start", x: 0, y: 0 },
            { id: "edge-end", x: 10, y: 0 },
          ],
          paths: [{ id: "path", handleIds: ["edge-start", "edge-end"] }],
          areas: [],
        },
        selection: selected({ kind: "path", id: "path" }),
        at: { x: 5, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: { handles: [{ id: "knob", x: 0, y: 0, yaw: 0 }], paths: [], areas: [] },
        selection: selected({ kind: "handle", id: "knob" }),
        at: { x: 1, y: 0 },
        tolerance: NAN_TOLERANCE,
      }),
      coarse({
        scene: { handles: [{ id: "badge", x: 0, y: 0 }], paths: [], areas: [] },
        selection: selected({ kind: "handle", id: "badge" }),
        at: { x: 1, y: 1 },
        tolerance: NAN_TOLERANCE,
      }),
      probe({
        scene: {
          handles: [],
          paths: [],
          areas: [{ id: "area", ring: [{ x: 0, y: 0 }, { x: 4, y: 0 }] }],
        },
        selection: selected({ kind: "area", id: "area" }),
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

// ---------------------------------------------------------------------------
// Selection algebra.
// ---------------------------------------------------------------------------

describe("the selection is a set, maintained in one place", () => {
  const h0: EditTarget = { kind: "handle", id: "h0" };
  const h1: EditTarget = { kind: "handle", id: "h1" };
  const v2: EditTarget = { kind: "vertex", areaId: "area", index: 2 };

  it("[G1] keeps the primary inside the targets, always", () => {
    const selections: readonly EditSelection[] = [
      EMPTY_SELECTION,
      selectTargets(EMPTY_SELECTION, [h0], false),
      selectTargets(selectTargets(EMPTY_SELECTION, [h0], false), [h1], true),
      selectTargets(selectTargets(EMPTY_SELECTION, [h0, h1], false), [h1], true),
      pruneSelection(selectTargets(EMPTY_SELECTION, [h0, h1], false), {
        ...SCENE,
        handles: SCENE.handles.filter((handle) => handle.id !== "h1"),
      }),
    ];
    for (const selection of selections) {
      if (selection.primary !== null) {
        expect(isSelected(selection, selection.primary)).toBe(true);
      }
    }
  });

  it("[G2] never duplicates a target", () => {
    const selection = selectTargets(EMPTY_SELECTION, [h0, h0, h1, h0], false);
    expect(selection.targets).toEqual([h0, h1]);
    const again = selectTargets(selection, [h1], true);
    expect(again.targets).toEqual([h0]);
  });

  it("[G3] keeps selection order, and toggles additively", () => {
    const first = selectTargets(EMPTY_SELECTION, [h1], false);
    const second = selectTargets(first, [h0], true);
    expect(second.targets).toEqual([h1, h0]);
    expect(second.primary).toEqual(h0);
    const third = selectTargets(second, [h1], true);
    expect(third.targets).toEqual([h0]);
    expect(third.primary).toEqual(h0);
  });

  it("[G4] drops a target the scene no longer contains", () => {
    const selection = selectTargets(EMPTY_SELECTION, [h0, h1, v2], false);
    const withoutH1: EditScene = {
      ...SCENE,
      handles: SCENE.handles.filter((handle) => handle.id !== "h1"),
    };
    const pruned = pruneSelection(selection, withoutH1);
    expect(pruned.targets).toEqual([h0, v2]);
    expect(pruned.primary).toEqual(v2);

    // A vertex whose index no longer exists goes too.
    const shortRing: EditScene = {
      ...SCENE,
      areas: [{ id: "area", ring: [{ x: 10, y: 10 }, { x: 14, y: 10 }] }],
    };
    expect(pruneSelection(selection, shortRing).targets).toEqual([h0, h1]);
    // And an unchanged selection is returned as-is.
    expect(pruneSelection(selection, SCENE)).toBe(selection);
  });

  it("compares targets by identity, not by shape alone", () => {
    expect(sameTarget(h0, { kind: "handle", id: "h0" })).toBe(true);
    expect(sameTarget(h0, { kind: "path", id: "h0" })).toBe(false);
    expect(sameTarget(v2, { kind: "vertex", areaId: "area", index: 2 })).toBe(true);
    expect(sameTarget(v2, { kind: "vertex", areaId: "other", index: 2 })).toBe(false);
    expect(sameTarget(v2, { kind: "vertex", areaId: "area", index: 1 })).toBe(false);
  });

  it("expands an object target to the leaf points a move actually moves", () => {
    expect(leafTargets(SCENE, AREA)).toEqual([
      { kind: "vertex", areaId: "area", index: 0 },
      { kind: "vertex", areaId: "area", index: 1 },
      { kind: "vertex", areaId: "area", index: 2 },
    ]);
    // A path expands to its RESOLVED handles: the id the scene has lost is not
    // conjured into a leaf.
    expect(leafTargets(SCENE, ROUTE)).toEqual([
      { kind: "handle", id: "h0" },
      { kind: "handle", id: "h1" },
      { kind: "handle", id: "h2" },
    ]);
    expect(leafTargets(SCENE, { kind: "handle", id: "h0" })).toEqual([
      { kind: "handle", id: "h0" },
    ]);
  });

  it("reports a leaf's position, and null for what the scene lost", () => {
    expect(targetPosition(SCENE, { kind: "handle", id: "h1" })).toEqual({ x: 4, y: 0 });
    expect(targetPosition(SCENE, { kind: "vertex", areaId: "area", index: 1 })).toEqual({
      x: 14,
      y: 10,
    });
    expect(targetPosition(SCENE, { kind: "handle", id: "gone" })).toBeNull();
    expect(targetPosition(SCENE, { kind: "vertex", areaId: "area", index: 9 })).toBeNull();
    // An object target has no single position of its own.
    expect(targetPosition(SCENE, ROUTE)).toBeNull();
  });

  it("toggles with Shift, isolates a member of a multi-selection, deselects the last one", () => {
    const at = { x: 4, y: 0 };
    expect(resolveClick(withShift(probe({ at })))).toEqual({
      kind: "select-set",
      targets: [{ kind: "handle", id: "h1" }],
      additive: true,
    });
    const multi = selectTargets(EMPTY_SELECTION, [{ kind: "handle", id: "h1" }, ROUTE], false);
    expect(resolveClick(probe({ selection: multi, at }))).toEqual({
      kind: "select-set",
      targets: [{ kind: "handle", id: "h1" }],
      additive: false,
    });
    const single = selected({ kind: "handle", id: "h1" });
    expect(resolveClick(probe({ selection: single, at }))).toEqual({ kind: "deselect" });
  });
});

// ---------------------------------------------------------------------------
// Moves, one gesture at a time.
// ---------------------------------------------------------------------------

describe("moves are a set, so one gesture is one undo step", () => {
  it("moves only the pressed point when it is not in the selection", () => {
    const grip = resolveGrip(probe({ at: { x: 4, y: 0 } }));
    expect(grip).toEqual({
      kind: "move-set",
      members: [{ target: { kind: "handle", id: "h1" }, from: { x: 4, y: 0 } }],
      origin: { x: 4, y: 0 },
    });
    expect(resolveDragRelease(grip!, { x: 6, y: 1 }, probe())).toEqual({
      kind: "move-set",
      moves: [{ target: { kind: "handle", id: "h1" }, at: { x: 6, y: 1 } }],
    });
  });

  it("moves the whole selection with one delta when the pressed point is a member", () => {
    const selection = selectTargets(
      EMPTY_SELECTION,
      [
        { kind: "handle", id: "h1" },
        { kind: "handle", id: "h2" },
      ],
      false,
    );
    const value = probe({ selection, at: { x: 4, y: 0 } });
    const grip = resolveGrip(value);
    expect(grip?.kind).toBe("move-set");
    // The pressed point leads, so a constraint or a snap is measured against
    // what the operator actually grabbed.
    expect(grip).toMatchObject({
      members: [
        { target: { kind: "handle", id: "h1" }, from: { x: 4, y: 0 } },
        { target: { kind: "handle", id: "h2" }, from: { x: 4, y: 4 } },
      ],
    });
    expect(resolveDragRelease(grip!, { x: 5, y: 2 }, value)).toEqual({
      kind: "move-set",
      moves: [
        { target: { kind: "handle", id: "h1" }, at: { x: 5, y: 2 } },
        { target: { kind: "handle", id: "h2" }, at: { x: 5, y: 6 } },
      ],
    });
  });

  it("translates an armed edge by moving both of its endpoints", () => {
    const value = probe({ selection: selected(ROUTE), at: { x: 2, y: 0 } });
    const grip = resolveGrip(value);
    expect(grip).toMatchObject({
      kind: "move-set",
      members: [
        { target: { kind: "handle", id: "h0" }, from: { x: 0, y: 0 } },
        { target: { kind: "handle", id: "h1" }, from: { x: 4, y: 0 } },
      ],
    });
    expect(resolveDragRelease(grip!, { x: 2, y: 3 }, value)).toEqual({
      kind: "move-set",
      moves: [
        { target: { kind: "handle", id: "h0" }, at: { x: 0, y: 3 } },
        { target: { kind: "handle", id: "h1" }, at: { x: 4, y: 3 } },
      ],
    });
  });

  it("translates an armed ring edge, wrap-around included", () => {
    const value = probe({ selection: selected(AREA), at: { x: 12, y: 10 } });
    const grip = resolveGrip(value);
    expect(grip).toMatchObject({
      kind: "move-set",
      members: [
        { target: { kind: "vertex", areaId: "area", index: 0 } },
        { target: { kind: "vertex", areaId: "area", index: 1 } },
      ],
    });
    // The closing edge (index 2) joins the last vertex to the first.
    const closing = probe({ selection: selected(AREA), at: { x: 11, y: 12 } });
    expect(resolveGrip(closing)).toMatchObject({
      kind: "move-set",
      members: [
        { target: { kind: "vertex", areaId: "area", index: 2 } },
        { target: { kind: "vertex", areaId: "area", index: 0 } },
      ],
    });
  });

  it("moves a selected area's whole ring from its interior", () => {
    const value = probe({ selection: selected(AREA), at: { x: 12, y: 11.5 } });
    const grip = resolveGrip(value);
    expect(grip?.kind).toBe("move-set");
    const release = resolveDragRelease(grip!, { x: 13, y: 12.5 }, value);
    expect(release).toEqual({
      kind: "move-set",
      moves: [
        { target: { kind: "vertex", areaId: "area", index: 0 }, at: { x: 11, y: 11 } },
        { target: { kind: "vertex", areaId: "area", index: 1 }, at: { x: 15, y: 11 } },
        { target: { kind: "vertex", areaId: "area", index: 2 }, at: { x: 13, y: 15 } },
      ],
    });
  });

  it("reports nothing for a move set whose members all vanished", () => {
    const grip: DragGrip = { kind: "move-set", members: [], origin: { x: 0, y: 0 } };
    expect(resolveDragRelease(grip, { x: 1, y: 1 }, probe())).toEqual({ kind: "nothing" });
    expect(resolveMoveSet(grip, { x: 1, y: 1 }, probe()).moves).toEqual([]);
  });

  it("computes rotate yaw from the origin frozen when the knob was pressed", () => {
    const grip: DragGrip = { kind: "rotate", id: "pose", origin: { x: 2, y: 3 } };
    expect(resolveDragRelease(grip, { x: 2, y: 8 }, probe())).toEqual({
      kind: "rotate",
      id: "pose",
      yaw: Math.PI / 2,
    });
    expect(resolveDragRelease(grip, { x: 1, y: 2 }, probe())).toEqual({
      kind: "rotate",
      id: "pose",
      yaw: (-3 * Math.PI) / 4,
    });
  });

  it("carries an insertion's index through to the release position", () => {
    const secondSegment = withAlt(probe({ selection: selected(ROUTE), at: { x: 4.1, y: 2.5 } }));
    expect(resolveAffordance(secondSegment)).toEqual({
      kind: "ghost",
      pathId: "route",
      segmentIndex: 1,
      at: { x: 4, y: 2.5 },
    });
    const grip = resolveGrip(secondSegment);
    expect(grip).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 1,
      at: { x: 4, y: 2.5 },
    });
    expect(resolveDragRelease(grip!, { x: 5, y: 3 }, secondSegment)).toEqual({
      kind: "insert",
      pathId: "route",
      afterIndex: 1,
      at: { x: 5, y: 3 },
    });
  });
});

// ---------------------------------------------------------------------------
// Constraint and snapping.
// ---------------------------------------------------------------------------

describe("constraint and snapping resolve in a declared order", () => {
  it("states its two angular quanta, and shares the rotation one with the native twin", () => {
    expect(AXIS_STEP_RAD).toBeCloseTo(Math.PI / 4);
    expect(YAW_STEP_RAD).toBeCloseTo(Math.PI / 12);
  });

  it("projects a constrained drag onto the nearest 45-degree ray from the origin", () => {
    const value = withShift(probe({ snapping: NO_SNAP }));
    const resolved = resolvePosition({ x: 10, y: 6 }, {
      origin: { x: 0, y: 0 },
      probe: value,
      exclude: [],
    });
    expect(resolved.constrained).toBe(true);
    // 10,6 is 31 degrees from the origin, so the nearest ray is 45: the
    // travelled distance along that ray is kept, and the position lands on it.
    expect(resolved.at.x).toBeCloseTo(8);
    expect(resolved.at.y).toBeCloseTo(8);
    expect(resolved.snap).toBeNull();

    // A shallower angle rounds the other way, onto the x axis.
    const shallow = resolvePosition({ x: 10, y: 2 }, {
      origin: { x: 0, y: 0 },
      probe: value,
      exclude: [],
    });
    expect(shallow.at.y).toBeCloseTo(0);
    expect(shallow.at.x).toBeCloseTo(10);
  });

  it("does not constrain without Shift, or without an origin to measure from", () => {
    expect(
      resolvePosition({ x: 10, y: 6 }, { origin: { x: 0, y: 0 }, probe: probe(), exclude: [] }),
    ).toEqual({ at: { x: 10, y: 6 }, constrained: false, snap: null });
    expect(
      resolvePosition({ x: 10, y: 6 }, {
        origin: null,
        probe: withShift(probe()),
        exclude: [],
      }),
    ).toEqual({ at: { x: 10, y: 6 }, constrained: false, snap: null });
  });

  it("quantises a rotation to 15 degrees while Shift is held", () => {
    const grip: DragGrip = { kind: "rotate", id: "h0", origin: { x: 0, y: 0 } };
    const free = resolveDragRelease(grip, { x: 10, y: 1 }, probe());
    const held = resolveDragRelease(grip, { x: 10, y: 1 }, withShift(probe()));
    expect(free).toMatchObject({ kind: "rotate", yaw: Math.atan2(1, 10) });
    expect(held).toMatchObject({ kind: "rotate", yaw: 0 });
    const quarter = resolveDragRelease(grip, { x: 1, y: 0.9 }, withShift(probe()));
    expect((quarter as { yaw: number }).yaw).toBeCloseTo(YAW_STEP_RAD * 3);
  });

  it("snaps to an existing vertex in preference to an edge, an axis or the grid", () => {
    const scene: EditScene = {
      handles: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 10, y: 0 },
        { id: "target", x: 5, y: 5 },
      ],
      paths: [{ id: "line", handleIds: ["a", "b"] }],
      areas: [],
    };
    const value = probe({
      scene,
      snapping: { enabled: true, toGeometry: true, toGrid: true },
      grid: { pitchM: 1, origin: { x: 0, y: 0 } },
      tolerance: { ...TOLERANCE, snapM: 0.3 },
    });
    const resolved = resolvePosition({ x: 5.1, y: 5.05 }, {
      origin: null,
      probe: value,
      exclude: [],
    });
    expect(resolved.snap).toEqual({
      kind: "vertex",
      at: { x: 5, y: 5 },
      target: { kind: "handle", id: "target" },
    });
    expect(resolved.at).toEqual({ x: 5, y: 5 });
  });

  it("snaps to an edge when no vertex is in reach", () => {
    const scene: EditScene = {
      handles: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 10, y: 0 },
      ],
      paths: [{ id: "line", handleIds: ["a", "b"] }],
      areas: [],
    };
    const resolved = resolvePosition({ x: 5, y: 0.1 }, {
      origin: null,
      probe: probe({ scene, snapping: GEOMETRY_SNAP, tolerance: { ...TOLERANCE, snapM: 0.3 } }),
      exclude: [],
    });
    expect(resolved.snap).toEqual({
      kind: "edge",
      at: { x: 5, y: 0 },
      owner: { kind: "path", id: "line" },
      edgeIndex: 0,
    });
  });

  it("snaps to an alignment axis when neither a vertex nor an edge is in reach", () => {
    const scene: EditScene = {
      handles: [{ id: "far", x: 20, y: 7 }],
      paths: [],
      areas: [],
    };
    const resolved = resolvePosition({ x: 3, y: 7.05 }, {
      origin: null,
      probe: probe({ scene, snapping: GEOMETRY_SNAP, tolerance: { ...TOLERANCE, snapM: 0.3 } }),
      exclude: [],
    });
    expect(resolved.snap).toMatchObject({
      kind: "align",
      axis: "y",
      withTarget: { kind: "handle", id: "far" },
    });
    expect(resolved.at).toEqual({ x: 3, y: 7 });
  });

  it("snaps to a declared grid last, and not at all when no grid was declared", () => {
    const grid = { pitchM: 2, origin: { x: 0, y: 0 } };
    const withGrid = probe({
      scene: { handles: [], paths: [], areas: [] },
      snapping: { enabled: true, toGeometry: false, toGrid: true },
      grid,
      tolerance: { ...TOLERANCE, snapM: 0.5 },
    });
    expect(
      resolvePosition({ x: 4.2, y: 5.9 }, { origin: null, probe: withGrid, exclude: [] }),
    ).toEqual({ at: { x: 4, y: 6 }, constrained: false, snap: { kind: "grid", at: { x: 4, y: 6 } } });

    const geometryOnly = probe({
      scene: { handles: [], paths: [], areas: [] },
      snapping: GEOMETRY_SNAP,
      grid,
    });
    expect(
      resolvePosition({ x: 4.2, y: 5.9 }, { origin: null, probe: geometryOnly, exclude: [] }).snap,
    ).toBeNull();
  });

  it("does not snap a moved point to itself or to its own companions", () => {
    const scene: EditScene = {
      handles: [
        { id: "moving", x: 5, y: 5 },
        { id: "friend", x: 5.05, y: 5 },
      ],
      paths: [],
      areas: [],
    };
    const value = probe({ scene, snapping: GEOMETRY_SNAP, tolerance: { ...TOLERANCE, snapM: 0.5 } });
    const resolved = resolvePosition({ x: 5.02, y: 5 }, {
      origin: null,
      probe: value,
      exclude: [
        { kind: "handle", id: "moving" },
        { kind: "handle", id: "friend" },
      ],
    });
    expect(resolved.snap).toBeNull();
    expect(resolved.at).toEqual({ x: 5.02, y: 5 });
  });

  it("snaps nothing at all when the magnet is off", () => {
    const scene: EditScene = { handles: [{ id: "near", x: 5, y: 5 }], paths: [], areas: [] };
    expect(
      resolvePosition({ x: 5.02, y: 5 }, {
        origin: null,
        probe: probe({ scene, snapping: NO_SNAP }),
        exclude: [],
      }),
    ).toEqual({ at: { x: 5.02, y: 5 }, constrained: false, snap: null });
  });

  it("keeps a snap on the constraint line rather than off it", () => {
    // The constraint states which positions are ALLOWED, so a snap that would
    // leave that line is projected back onto it instead of overriding it.
    const scene: EditScene = { handles: [{ id: "off-axis", x: 6, y: 2 }], paths: [], areas: [] };
    const value = withShift(
      probe({ scene, snapping: GEOMETRY_SNAP, tolerance: { ...TOLERANCE, snapM: 3 } }),
    );
    const resolved = resolvePosition({ x: 6, y: 0.2 }, {
      origin: { x: 0, y: 0 },
      probe: value,
      exclude: [],
    });
    expect(resolved.constrained).toBe(true);
    expect(resolved.at.y).toBeCloseTo(0);
    expect(resolved.snap?.kind).toBe("vertex");
  });

  it("applies the snap to the point being moved, not to the pointer", () => {
    // The operator grabs a handle off-centre; snapping the POINTER would put
    // the handle a pick radius away from what it visibly caught.
    const scene: EditScene = {
      handles: [
        { id: "moving", x: 0, y: 0 },
        { id: "target", x: 10, y: 0 },
      ],
      paths: [],
      areas: [],
    };
    const value = probe({
      scene,
      snapping: GEOMETRY_SNAP,
      tolerance: { ...TOLERANCE, snapM: 0.5 },
    });
    // Press 0.2 away from the handle, release near the target.
    const grip: DragGrip = {
      kind: "move-set",
      members: [{ target: { kind: "handle", id: "moving" }, from: { x: 0, y: 0 } }],
      origin: { x: 0.2, y: 0 },
    };
    const release = resolveDragRelease(grip, { x: 10.15, y: 0 }, value);
    expect(release).toEqual({
      kind: "move-set",
      moves: [{ target: { kind: "handle", id: "moving" }, at: { x: 10, y: 0 } }],
    });
  });

  it("refuses grid snapping that was requested without a usable grid", () => {
    const requested = { enabled: true, toGeometry: false, toGrid: true } as const;
    const missing = probe({ snapping: requested, grid: null });
    expect(resolveAffordance(missing)).toEqual({
      kind: "refused",
      reason: "Grid snapping was requested without a declared grid.",
    });
    expect(resolveClick(missing).kind).toBe("refused");
    expect(resolveGrip(missing)).toBeNull();

    for (const grid of [
      { pitchM: 0, origin: { x: 0, y: 0 } },
      { pitchM: -1, origin: { x: 0, y: 0 } },
      { pitchM: Number.NaN, origin: { x: 0, y: 0 } },
      { pitchM: 1, origin: { x: Number.NaN, y: 0 } },
    ]) {
      const value = probe({ snapping: requested, grid });
      expect(resolveAffordance(value).kind, JSON.stringify(grid)).toBe("refused");
    }
  });
});

// ---------------------------------------------------------------------------
// Marquee.
// ---------------------------------------------------------------------------

describe("the marquee is the host's rectangle, or it is refused", () => {
  it("encloses handles and armed rings' vertices, in scene order", () => {
    const value = probe({ selection: selected(AREA) });
    const outcome = marqueeTargets(value, { x: -1, y: -1 }, { x: 11, y: 11 });
    expect(outcome).toEqual({
      kind: "targets",
      targets: [
        { kind: "handle", id: "h0" },
        { kind: "handle", id: "h1" },
        { kind: "handle", id: "h2" },
        { kind: "vertex", areaId: "area", index: 0 },
      ],
    });
  });

  it("leaves an unarmed ring's vertices out of the rectangle (invariant F')", () => {
    const outcome = marqueeTargets(probe(), { x: 9, y: 9 }, { x: 15, y: 15 });
    expect(outcome).toEqual({ kind: "targets", targets: [] });
  });

  it("normalises the rectangle, so dragging up-left selects the same set", () => {
    const forward = marqueeTargets(probe(), { x: -1, y: -1 }, { x: 5, y: 5 });
    const backward = marqueeTargets(probe(), { x: 5, y: 5 }, { x: -1, y: -1 });
    expect(backward).toEqual(forward);
  });

  it("delegates the rectangle to a host that declared one", () => {
    const screenMarquee: EditScreenMarquee = (klass, candidates) =>
      klass === "handle" ? candidates.map((_candidate, index) => index) : [];
    const outcome = marqueeTargets(
      probe({ screenRank: proximityScreenRank({ x: 0, y: 0 }), screenMarquee }),
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    );
    expect(outcome).toEqual({
      kind: "targets",
      targets: [
        { kind: "handle", id: "h0" },
        { kind: "handle", id: "h1" },
        { kind: "handle", id: "h2" },
      ],
    });
  });

  it("ignores an out-of-range index from a declared rectangle", () => {
    const screenMarquee: EditScreenMarquee = () => [0, 99, -1, 1.5];
    const outcome = marqueeTargets(
      probe({ screenRank: proximityScreenRank({ x: 0, y: 0 }), screenMarquee }),
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    );
    expect(outcome).toEqual({
      kind: "targets",
      targets: [{ kind: "handle", id: "h0" }],
    });
  });

  it("refuses a perspective host that declared no rectangle frame", () => {
    // A screen rectangle is a trapezoid on the world floor: building an
    // axis-aligned world rectangle from two world corners is WRONG, not
    // approximate, so it is refused rather than approximated.
    const value = probe({ screenRank: proximityScreenRank({ x: 0, y: 0 }) });
    const outcome = marqueeTargets(value, { x: -1, y: -1 }, { x: 11, y: 11 });
    expect(outcome.kind).toBe("refused");
    const grip: DragGrip = { kind: "marquee", from: { x: -1, y: -1 }, additive: true };
    expect(resolveDragRelease(grip, { x: 11, y: 11 }, value).kind).toBe("refused");
  });

  it("selects additively on release, so a marquee adds to what was selected", () => {
    const value = probe();
    const grip = resolveGrip(withShift(value));
    expect(grip).toEqual({ kind: "marquee", from: { x: 30, y: 30 }, additive: true });
    expect(resolveDragRelease(grip!, { x: -1, y: -1 }, value)).toEqual({
      kind: "select-set",
      targets: [
        { kind: "handle", id: "h0" },
        { kind: "handle", id: "h1" },
        { kind: "handle", id: "h2" },
      ],
      additive: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Armed modes.
// ---------------------------------------------------------------------------

describe("armed modes place, close, finish and resume", () => {
  it("places exactly where the press landed", () => {
    // Away from every existing endpoint: an endpoint would resume that path
    // instead, which is the point of the case below it.
    expect(resolveClick(probe({ mode: "append", at: { x: 30, y: 30 } }))).toEqual({
      kind: "place",
      at: { x: 30, y: 30 },
    });
    expect(
      resolveClick(probe({ mode: "append", capabilities: UNSUPPORTED, at: { x: 30, y: 30 } })),
    ).toEqual({ kind: "place", at: { x: 30, y: 30 } });
  });

  it("closes only on a non-empty drawing's first vertex, otherwise draws", () => {
    expect(
      resolveClick(probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 1.1, y: 1 } })),
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
      resolveClick(probe({ mode: "draw-area", drawing: [{ x: 1, y: 1 }], at: { x: 2, y: 2 } })),
    ).toEqual({ kind: "draw", at: { x: 2, y: 2 } });
  });

  it("refuses to end an area at its last point instead of quietly leaving it open", () => {
    const value = probe({
      mode: "draw-area",
      drawing: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }],
      at: { x: 4, y: 4 },
    });
    expect(resolveAffordance(value).kind).toBe("run-last");
    expect(resolveClick(value)).toEqual({ kind: "refused", reason: AREA_MUST_CLOSE });
  });

  it("closes an area on a double click only once it has three corners", () => {
    const three = probe({
      mode: "draw-area",
      drawing: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }],
      at: { x: 9, y: 9 },
    });
    expect(resolveDoubleClick(three)).toEqual({ kind: "close-ring" });
    const two = probe({
      mode: "draw-area",
      drawing: [{ x: 0, y: 0 }, { x: 4, y: 0 }],
      at: { x: 9, y: 9 },
    });
    expect(resolveDoubleClick(two)).toEqual({ kind: "refused", reason: AREA_TOO_FEW });
  });

  it("finishes an append run on its last point or on a double click", () => {
    const value = probe({
      mode: "append",
      drawing: [{ x: 0, y: 0 }, { x: 5, y: 5 }],
      at: { x: 5, y: 5 },
    });
    expect(resolveClick(value)).toEqual({ kind: "finish-run" });
    expect(
      resolveDoubleClick(probe({ mode: "append", drawing: [{ x: 5, y: 5 }], at: { x: 9, y: 9 } })),
    ).toEqual({ kind: "finish-run" });
  });

  it("resumes an existing open path from the end that was clicked", () => {
    const head = probe({ mode: "append", drawing: null, at: { x: 0.05, y: 0 } });
    expect(resolveAffordance(head)).toEqual({
      kind: "path-endpoint",
      pathId: "route",
      endpoint: "head",
      at: { x: 0, y: 0 },
    });
    expect(resolveClick(head)).toEqual({
      kind: "resume-drawing",
      pathId: "route",
      endpoint: "head",
    });

    const tail = probe({ mode: "append", drawing: null, at: { x: 4, y: 4 } });
    expect(resolveClick(tail)).toEqual({
      kind: "resume-drawing",
      pathId: "route",
      endpoint: "tail",
    });
  });

  it("stops offering an endpoint once the run it started is under way", () => {
    // Otherwise the operator's own first point would offer to resume itself.
    const value = probe({ mode: "append", drawing: [{ x: 9, y: 9 }], at: { x: 0, y: 0 } });
    expect(resolveAffordance(value).kind).toBe("floor");
    expect(resolveClick(value)).toEqual({ kind: "place", at: { x: 0, y: 0 } });
  });

  it("offers no endpoint on a path with fewer than two points", () => {
    const oneHandle: EditScene = {
      handles: [{ id: "lonely", x: 0, y: 0 }],
      paths: [{ id: "stub", handleIds: ["lonely"] }],
      areas: [],
    };
    expect(
      resolveAffordance(probe({ scene: oneHandle, mode: "append", at: { x: 0, y: 0 } })).kind,
    ).toBe("floor");
  });

  it("refuses an unsupported area mode with the exact declared reason", () => {
    expect(
      resolveClick(
        probe({ mode: "draw-area", capabilities: UNSUPPORTED, drawing: [], at: { x: 1, y: 1 } }),
      ),
    ).toEqual({ kind: "refused", reason: REFUSAL });
    expect(modeRefusalsFor(SUPPORTED)).toEqual({});
    expect(modeRefusalsFor(UNSUPPORTED)).toEqual({ "draw-area": REFUSAL });
  });
});

// ---------------------------------------------------------------------------
// Cursors.
// ---------------------------------------------------------------------------

describe("the cursor vocabulary is total", () => {
  const stateFor = (value: EditProbe, dragging: Parameters<typeof cursorFor>[1]["dragging"] = null) => ({
    probe: value,
    dragging,
  });

  it("gives every affordance a NAME, and never undefined", () => {
    const affordances: readonly EditAffordance[] = [
      { kind: "none" },
      { kind: "handle", id: "h" },
      { kind: "badge", target: { kind: "handle", id: "h" }, at: { x: 0, y: 0 } },
      { kind: "knob", id: "h", at: { x: 0, y: 0 } },
      { kind: "ghost", pathId: "p", segmentIndex: 0, at: { x: 0, y: 0 } },
      { kind: "ghost-vertex", areaId: "a", edgeIndex: 0, at: { x: 0, y: 0 } },
      { kind: "path-edge", pathId: "p", segmentIndex: 0, at: { x: 0, y: 0 } },
      { kind: "ring-edge", areaId: "a", edgeIndex: 0, at: { x: 0, y: 0 } },
      { kind: "vertex", areaId: "a", index: 0 },
      { kind: "area", id: "a" },
      { kind: "path", id: "p" },
      { kind: "run-first", at: { x: 0, y: 0 } },
      { kind: "run-last", at: { x: 0, y: 0 } },
      { kind: "path-endpoint", pathId: "p", endpoint: "head", at: { x: 0, y: 0 } },
      { kind: "floor" },
      { kind: "refused", reason: REFUSAL },
    ];
    const seenNames = new Set<EditCursorName>();
    for (const affordance of affordances) {
      const cursor = cursorFor(affordance, stateFor(probe()));
      expect(cursor.name, affordance.kind).toBeTruthy();
      expect(EDIT_CURSOR_VALUES[cursor.name], affordance.kind).toBe(cursor.value);
      seenNames.add(cursor.name);
      // With Alt held, a point promises removal and an edge promises insertion.
      seenNames.add(cursorFor(affordance, stateFor(withAlt(probe()))).name);
      seenNames.add(cursorFor(affordance, stateFor(withShift(probe()))).name);
      seenNames.add(cursorFor(affordance, stateFor(probe({ mode: "append" }))).name);
    }
    for (const dragging of ["move", "insert", "rotate", "marquee"] as const) {
      seenNames.add(cursorFor({ kind: "floor" }, stateFor(probe(), dragging)).name);
    }
    // Every affordance kind is covered above: the list length is checked
    // against the type's own kinds through EDIT_CURSOR_VALUES accounting below.
    expect(affordances).toHaveLength(16);

    const unreached = Object.keys(EDIT_CURSOR_VALUES).filter(
      (name) => !seenNames.has(name as EditCursorName),
    );
    expect(unreached, {
      message:
        `These cursor names are declared in EDIT_CURSOR_VALUES but no affordance and ` +
        `modifier combination above produces them: ${unreached.join(", ")}. A name nothing ` +
        "can reach is either dead or a gap in this accounting.",
    } as never).toEqual([]);
  });

  it("delegates the camera surface to the host, as a declared value and not an omission", () => {
    const cursor = cursorFor({ kind: "floor" }, stateFor(probe()));
    expect(cursor).toEqual({ name: "host-resting", value: null });
  });

  it("shows a modifier's promise BEFORE the press", () => {
    const point: EditAffordance = { kind: "handle", id: "h" };
    const edge: EditAffordance = { kind: "path-edge", pathId: "p", segmentIndex: 0, at: { x: 0, y: 0 } };
    expect(cursorFor(point, stateFor(probe())).name).toBe("grab");
    expect(cursorFor(point, stateFor(withAlt(probe()))).name).toBe("pen-minus");
    expect(cursorFor(edge, stateFor(probe())).name).toBe("move");
    expect(
      cursorFor(
        { kind: "ghost", pathId: "p", segmentIndex: 0, at: { x: 0, y: 0 } },
        stateFor(withAlt(probe())),
      ).name,
    ).toBe("pen-plus");
    expect(cursorFor({ kind: "floor" }, stateFor(withShift(probe()))).name).toBe("marquee");
  });

  it("does not promise Alt's meaning to a finger that cannot hold it", () => {
    expect(
      cursorFor({ kind: "handle", id: "h" }, stateFor(withAlt(coarse()))).name,
    ).toBe("grab");
  });

  it("names the live drag over the thing beneath it", () => {
    expect(cursorFor({ kind: "handle", id: "h" }, stateFor(probe(), "move")).name).toBe("grabbing");
    expect(cursorFor({ kind: "handle", id: "h" }, stateFor(probe(), "insert")).name).toBe("grabbing");
    expect(cursorFor({ kind: "handle", id: "h" }, stateFor(probe(), "rotate")).name).toBe("rotating");
    expect(cursorFor({ kind: "floor" }, stateFor(probe(), "marquee")).name).toBe("marquee");
  });

  it("says `move` for a selected area's interior and `select` for an unselected one", () => {
    const area: EditAffordance = { kind: "area", id: "area" };
    expect(cursorFor(area, stateFor(probe())).name).toBe("select");
    expect(cursorFor(area, stateFor(probe({ selection: selected(AREA) }))).name).toBe("move");
  });

  it("gives every custom cursor a keyword fallback, as CSS requires", () => {
    for (const [name, value] of Object.entries(EDIT_CURSOR_VALUES)) {
      if (value === null || !value.startsWith("url(")) {
        continue;
      }
      // `cursor: url(...)` without a trailing keyword is invalid CSS and the
      // whole declaration is dropped, so the keyword is a required part of the
      // value rather than a silent fallback.
      expect(value, name).toMatch(/,\s*[a-z-]+$/);
    }
  });
});

describe("a host may declare its paths to be selectable graph edges", () => {
  /**
   * Two waypoints joined by one line: what a road graph's edge actually is.
   *
   * The suite's own SCENE is deliberately NOT this — its `route` resolves to
   * three points, which is an ordered route — so the two scenes together cover
   * both sides of the declaration's own precondition.
   */
  const GRAPH: EditScene = {
    handles: [
      { id: "h0", x: 0, y: 0 },
      { id: "h1", x: 4, y: 0 },
    ],
    paths: [{ id: "e0", handleIds: ["h0", "h1"] }],
    areas: [],
  };
  const EDGE: EditTarget = { kind: "path", id: "e0" };
  /** Mid-line, two metres from either endpoint, so no handle is in reach. */
  const ON_THE_LINE = { x: 2, y: 0 };

  const DECLARED: EditCapabilities = { areas: { supported: true }, edges: { supported: true } };
  const REFUSES_EDGES: EditCapabilities = {
    areas: { supported: true },
    edges: { supported: false, reason: "This recording is an ordered route." },
  };

  /** A probe pointing at the line, with the arming and the declaration named. */
  function atLine(options: {
    readonly capabilities?: EditCapabilities;
    readonly selection?: EditSelection;
    readonly modality?: "fine" | "coarse";
  }): EditProbe {
    return probe({
      scene: GRAPH,
      at: ON_THE_LINE,
      capabilities: options.capabilities ?? SUPPORTED,
      selection: options.selection ?? EMPTY_SELECTION,
      modality: options.modality ?? "fine",
    });
  }

  const ARMED_BY_ITSELF = selected(EDGE);
  const ARMED_BY_A_HANDLE = selected({ kind: "handle", id: "h0" });

  describe("declared: a click on a line selects it, in both modalities and armed or not", () => {
    const armings = [
      ["unarmed", EMPTY_SELECTION],
      ["armed by itself", ARMED_BY_ITSELF],
      ["armed by one of its handles", ARMED_BY_A_HANDLE],
    ] as const;
    for (const modality of ["fine", "coarse"] as const) {
      for (const [arming, selection] of armings) {
        it(`selects the path in ${modality} input when it is ${arming}`, () => {
          expect(
            resolveClick(atLine({ capabilities: DECLARED, selection, modality })),
          ).toEqual({ kind: "select-set", targets: [EDGE], additive: false });
        });
      }
    }

    it("never answers deselect for a line that is already the whole selection", () => {
      // `selectionClick` would, for a lone selected object. A corridor is
      // walked line by line, so a click that dropped the selection halfway
      // along would make the walk unusable; the floor still deselects.
      const answer = resolveClick(
        atLine({ capabilities: DECLARED, selection: ARMED_BY_ITSELF }),
      );
      expect(answer.kind).not.toBe("deselect");
      expect(
        resolveClick(
          probe({ scene: GRAPH, at: { x: 30, y: 30 }, capabilities: DECLARED }),
        ),
      ).toEqual({ kind: "deselect" });
    });

    it("still toggles additively under Shift", () => {
      expect(
        resolveClick(withShift(atLine({ capabilities: DECLARED, selection: ARMED_BY_ITSELF }))),
      ).toEqual({ kind: "select-set", targets: [EDGE], additive: true });
    });

    it("leaves Alt-click on an armed line as the insertion it already was", () => {
      // Invariant A': the modified click keeps its declared, previewed meaning.
      expect(
        resolveClick(
          withAlt(atLine({ capabilities: DECLARED, selection: ARMED_BY_ITSELF })),
        ),
      ).toEqual({ kind: "insert", pathId: "e0", afterIndex: 0, at: ON_THE_LINE });
    });

    it("changes no affordance, no grip and no pick order", () => {
      // The declaration widens the CLICK table alone. If it moved a path edge
      // up the pick order, a handle or a ring edge could lose a press to it.
      for (const modality of ["fine", "coarse"] as const) {
        for (const [, selection] of armings) {
          const declared = atLine({ capabilities: DECLARED, selection, modality });
          const plain = atLine({ capabilities: SUPPORTED, selection, modality });
          expect(resolveAffordance(declared)).toEqual(resolveAffordance(plain));
          expect(resolveGrip(declared)).toEqual(resolveGrip(plain));
        }
      }
    });

    it("keeps the drag on an armed line a translation, so tap and drag differ deliberately", () => {
      const grip = resolveGrip(atLine({ capabilities: DECLARED, selection: ARMED_BY_ITSELF }));
      expect(grip?.kind).toBe("move-set");
      // Coarse has no hover and no double click, so the tap carries the
      // selection while the drag keeps the insertion the midpoint advertises.
      expect(
        resolveGrip(atLine({ capabilities: DECLARED, modality: "coarse" }))?.kind,
      ).toBe("insert");
    });
  });

  describe("declared over an ordered route: refused, never approximated", () => {
    it("refuses a click on a path that carries more than one segment", () => {
      // EditTarget can name a path but not one segment of it, so selecting the
      // whole route would answer a question the operator did not ask.
      for (const modality of ["fine", "coarse"] as const) {
        for (const selection of [EMPTY_SELECTION, selected(ROUTE)]) {
          expect(
            resolveClick(
              probe({ capabilities: DECLARED, selection, modality, at: { x: 2, y: 0 } }),
            ),
          ).toEqual({ kind: "refused", reason: EDGE_NOT_A_SINGLE_LINE });
        }
      }
    });

    it("leaves that same route alone when the capability is not declared", () => {
      expect(
        resolveClick(probe({ selection: selected(ROUTE), at: { x: 2, y: 0 } })),
      ).toEqual({ kind: "nothing" });
    });
  });

  describe("undeclared and declared-unsupported: today's answers, unchanged", () => {
    const undeclared = [
      ["omitted", SUPPORTED],
      ["declared unsupported", REFUSES_EDGES],
    ] as const;
    for (const [how, capabilities] of undeclared) {
      it(`answers nothing for an armed line in fine input (${how})`, () => {
        expect(
          resolveClick(atLine({ capabilities, selection: ARMED_BY_ITSELF })),
        ).toEqual({ kind: "nothing" });
      });

      it(`answers nothing for a line in coarse input, armed or not (${how})`, () => {
        expect(
          resolveClick(atLine({ capabilities, modality: "coarse" })),
        ).toEqual({ kind: "nothing" });
        expect(
          resolveClick(
            atLine({ capabilities, modality: "coarse", selection: ARMED_BY_ITSELF }),
          ),
        ).toEqual({ kind: "nothing" });
      });

      it(`still selects an UNARMED line in fine input (${how})`, () => {
        // The affordance that selects an unarmed object (invariant F') has
        // always been there; the capability adds nothing to this case.
        expect(resolveClick(atLine({ capabilities }))).toEqual({
          kind: "select-set",
          targets: [EDGE],
          additive: false,
        });
      });
    }
  });
});
