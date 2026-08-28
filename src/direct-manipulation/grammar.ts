/**
 * @file The direct-manipulation editing grammar: a world-frame pointer probe
 * becomes an affordance, a drag grip, or a document intent.
 *
 * This module owns the meaning and priority of map gestures. It refuses to know
 * about pixels, React, renderer objects, camera state, or how an intent changes
 * any consumer's document. Surfaces declare their pointer frame: raster
 * surfaces use metre tolerances, while perspective surfaces may delegate each
 * class's screen-space distance decision and provide depth-aware anchors. The
 * metric path is the raster surface's declared frame, not a fallback; NaN
 * tolerances make an undeclared frame fail loudly.
 *
 * Three invariants are structural here. Each sentence below is pinned by a
 * `describe` of the same name in `grammar.spec.ts`, and
 * `direct-manipulation-boundary.spec.ts` compares the two texts statically, so
 * a reworded invariant cannot keep a test name that no longer describes it.
 *
 *  - Invariant A': in fine input a single click is non-destructive without exception (it selects, deselects, or does nothing), a double click is additive only (it inserts, never removes), and removal requires the Alt modifier, the host's chrome, or the host's native twin control; in coarse input the persistent delete badge stays the one click that removes.
 *  - Invariant D: an armed mode's drag always belongs to the camera, and a grip is the only thing that locks it.
 *  - Invariant F': a deformable sub-element (a ring vertex, a ring edge, a path segment) is a candidate only while its owning object is in the selection, and an unarmed object offers nothing except the affordance that selects it; fine input alone is armed this way, because coarse input has no hover with which to arm anything.
 *
 * Pure functions only: no React, DOM, renderer, pixels, wire, clock, or random.
 */

import {
  BADGE_ANCHOR_OFFSET_SCALE,
  COARSE_PICK_SCALE,
  EDIT_CURSORS,
  type GripClass,
} from "./constants";
import {
  AXIS_STEP_RAD,
  YAW_STEP_RAD,
  closestPointOnSegment,
  constrainToAxes,
  insideRect,
  isUsableGrid,
  pathSegments,
  rectBetween,
  ringEdges,
  snapAngle,
  snapToGrid,
  type EditGrid,
  type Vertex,
} from "./geometry";
import {
  areaBadgeAnchor,
  handleBadgeAnchor,
  headingKnobAt,
  insideRing,
  type Handle,
} from "./hit-test";

export type EditMode = "direct" | "append" | "draw-area";

/**
 * Whether an armed mode survives the intent it just produced.
 *
 * `sustained` is the pen rhythm: the mode stays until the operator ends the
 * run (a double click, the last point, Enter, Escape, or the chrome's finish
 * control). `one-shot` exhausts the mode after one placement, which a consumer
 * may still declare when its UI genuinely means "add one point".
 *
 * This is a hook option and not a probe field: how long a mode lasts does not
 * change what any single gesture means, so it is not the grammar's business.
 */
export type EditArming = "one-shot" | "sustained";

export type PointerModality = "fine" | "coarse";

/**
 * The classes whose distance decision a screen-space host may own.
 *
 * Two are not pick radii at all, and are delegated for the same reason the
 * pick radii are - on a perspective floor, "10 px away" is a different world
 * distance near and far:
 *
 *  - `snap`: the capture radius for snapping.
 *  - `reveal`: the ARMING radius, the distance at which the operator counts as
 *    having approached a selected target (see {@link revealedKnob}). It is much
 *    wider than any pick radius, so it cannot be answered by re-using one.
 */
export type EditPickClass =
  | "handle"
  | "ghost"
  | "knob"
  | "badge"
  | "vertex"
  | "snap"
  | "reveal";

/**
 * A screen-space distance decision for one class of candidates.
 *
 * The index alone is not enough once classes are arbitrated against each other
 * by distance (a badge must not shield a nearer handle), so the host reports
 * how far its winner was, in its own pixel frame. `null` is the authoritative
 * "out of range" — there is no metric fallback behind it.
 */
export type EditScreenRank = (
  klass: EditPickClass,
  candidates: readonly Vertex[],
  modality: PointerModality,
) => { readonly index: number; readonly distancePx: number } | null;

/**
 * A screen-space rectangle test for one class of candidates.
 *
 * A perspective host MUST declare this to receive a marquee: a screen
 * rectangle is a trapezoid on the world floor, so building an axis-aligned
 * world rectangle from two world corners is wrong rather than approximate. A
 * host that declares {@link EditScreenRank} and omits this one is refused (see
 * {@link marqueeTargets}); a raster host needs neither, because its world
 * rectangle IS its declared frame.
 *
 * `from` and `to` are world positions (press and current); the host projects
 * them and the candidates with its own camera.
 */
export type EditScreenMarquee = (
  klass: EditPickClass,
  candidates: readonly Vertex[],
  from: Vertex,
  to: Vertex,
) => readonly number[];

export type EditAnchors = {
  readonly knobAt: (handle: Handle) => Vertex | null;
  readonly badgeAt: (at: Vertex) => Vertex;
};

/**
 * The pointer gesture's modifier state.
 *
 * Shift constrains, Alt adds or removes a vertex. Ctrl and Meta have no seat
 * here BY TYPE: Ctrl+click synthesises a contextmenu on macOS (so its
 * pointerup may never arrive) and Meta is captured by the OS. A future caller
 * cannot quietly add them.
 */
export type EditModifiers = {
  readonly shift: boolean;
  readonly alt: boolean;
};

/** What the host declares the magnet does. Never inferred from a default. */
export type EditSnapping = {
  /** The chrome's magnet toggle. */
  readonly enabled: boolean;
  /** Snap to existing vertices, edges and alignment axes. */
  readonly toGeometry: boolean;
  /** Snap to the declared grid. Requesting this without a grid is refused. */
  readonly toGrid: boolean;
};

export type EditSupport =
  | { readonly supported: true }
  | { readonly supported: false; readonly reason: string };
export type EditCapabilities = { readonly areas: EditSupport };

export type HittablePath = { readonly id: string; readonly handleIds: readonly string[] };
export type HittableArea = { readonly id: string; readonly ring: readonly Vertex[] };
export type EditScene = {
  readonly handles: readonly Handle[];
  readonly paths: readonly HittablePath[];
  readonly areas: readonly HittableArea[];
};

/**
 * One selectable thing.
 *
 * `vertex` and `path` are first-class here so that a ring corner can be
 * selected on its own and a whole route can be armed (invariant F').
 */
export type EditTarget =
  | { readonly kind: "handle"; readonly id: string }
  | { readonly kind: "vertex"; readonly areaId: string; readonly index: number }
  | { readonly kind: "path"; readonly id: string }
  | { readonly kind: "area"; readonly id: string };

/**
 * The selection is a SET.
 *
 * `primary` is the last target touched, and it decides who owns an affordance
 * that only means something for one target (the heading knob). An empty
 * selection is `targets: []`, not `null`: "nothing is selected" and "nobody
 * declared a selection" are not worth distinguishing, and a nullable set
 * invites every consumer to invent its own empty.
 *
 * Four invariants hold, and {@link selectTargets} / {@link pruneSelection} are
 * the only entry points that produce a selection, so a consumer never has to
 * maintain them by hand:
 *
 *  - G1: `primary !== null` implies `primary` is in `targets`.
 *  - G2: `targets` has no duplicates (by {@link sameTarget}).
 *  - G3: `targets` is in the order the targets were selected; a marquee
 *    contributes them in scene order.
 *  - G4: a target the scene no longer contains is dropped by
 *    {@link pruneSelection} rather than silently ignored at every read.
 */
export type EditSelection = {
  readonly targets: readonly EditTarget[];
  readonly primary: EditTarget | null;
};

/** The empty selection. */
export const EMPTY_SELECTION: EditSelection = { targets: [], primary: null };

export type EditTolerances = {
  readonly handleM: number;
  readonly ghostM: number;
  readonly knobM: number;
  readonly badgeM: number;
  readonly headingArmM: number;
  /**
   * The fine-input arming radius: how near the pointer must be to a selected
   * target before that target's single-target affordance (the heading knob)
   * appears at all. Nothing floats next to a precise gesture that the operator
   * has not approached.
   */
  readonly revealM: number;
  /** The snap capture radius. */
  readonly snapM: number;
};

export type EditProbe = {
  readonly mode: EditMode;
  readonly modality: PointerModality;
  readonly scene: EditScene;
  readonly selection: EditSelection;
  readonly at: Vertex;
  readonly tolerance: EditTolerances;
  readonly capabilities: EditCapabilities;
  /**
   * The run in progress: the ring being drawn in draw-area, or the tail of the
   * path being extended in append. `null` means no run is in progress. A host
   * that does not supply it in append gets no rubber band and no `run-last`,
   * so ending the run falls to its own chrome.
   */
  readonly drawing: readonly Vertex[] | null;
  readonly screenRank?: EditScreenRank;
  readonly screenMarquee?: EditScreenMarquee;
  readonly anchors?: EditAnchors;
  /**
   * The three declarations below are REQUIRED. Made optional, a host that
   * forgot one would run silently with `false` — exactly the quiet degradation
   * this layer exists to refuse.
   */
  readonly modifiers: EditModifiers;
  readonly snapping: EditSnapping;
  readonly grid: EditGrid | null;
};

/**
 * What is under the pointer.
 *
 * The edge of an ARMED object appears twice, deliberately, because in fine
 * input Alt is the difference between moving it and adding to it:
 *
 *  - `path-edge` / `ring-edge` — the edge itself: hover highlights it and a
 *    drag translates it (both endpoints together). No point is conjured under
 *    the pointer.
 *  - `ghost` / `ghost-vertex` — a vertex will be INSERTED here: fine input
 *    shows this only while Alt is held (the marker sits at the edge's nearest
 *    point and does not follow the pointer), coarse input shows its persistent
 *    midpoints as before.
 */
export type EditAffordance =
  | { readonly kind: "none" }
  | { readonly kind: "handle"; readonly id: string }
  | { readonly kind: "badge"; readonly target: EditTarget; readonly at: Vertex }
  | { readonly kind: "knob"; readonly id: string; readonly at: Vertex }
  | {
      readonly kind: "ghost";
      readonly pathId: string;
      readonly segmentIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "ghost-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "path-edge";
      readonly pathId: string;
      readonly segmentIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "ring-edge";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "vertex"; readonly areaId: string; readonly index: number }
  | { readonly kind: "area"; readonly id: string }
  /** An unarmed path's line: the affordance that selects (arms) it. */
  | { readonly kind: "path"; readonly id: string }
  /** Armed: the first point of the run being drawn — this closes the ring. */
  | { readonly kind: "run-first"; readonly at: Vertex }
  /** Armed: the last point of the run being drawn — this ends the run. */
  | { readonly kind: "run-last"; readonly at: Vertex }
  /** Armed append with no run yet: an existing open path's end, which resumes. */
  | {
      readonly kind: "path-endpoint";
      readonly pathId: string;
      readonly endpoint: "head" | "tail";
      readonly at: Vertex;
    }
  | { readonly kind: "floor" }
  | { readonly kind: "refused"; readonly reason: string };

/** One member of a move, with the position it held when the press landed. */
export type EditMoveMember = { readonly target: EditTarget; readonly from: Vertex };

export type DragGrip =
  /**
   * Movement is always a set. `members` are LEAF targets (handles and ring
   * vertices) — an area or path in the selection is expanded to its own points
   * here, so a consumer applies one flat list of point moves and never has to
   * re-derive what "move an area" means.
   */
  | {
      readonly kind: "move-set";
      readonly members: readonly EditMoveMember[];
      readonly origin: Vertex;
    }
  | {
      readonly kind: "insert";
      readonly pathId: string;
      readonly afterIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "insert-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "rotate"; readonly id: string; readonly origin: Vertex }
  | { readonly kind: "marquee"; readonly from: Vertex; readonly additive: boolean };

/** One target's new position. */
export type EditMove = { readonly target: EditTarget; readonly at: Vertex };

/**
 * What a completed gesture means for the document.
 *
 * Operations that take the SELECTION as their object are stated as sets
 * (`select-set` / `move-set` / `delete-set`); operations that take a POSITION
 * are singular (`insert` / `place` / `draw` / `rotate`). There is deliberately
 * no second, singular spelling of a set operation: two ways to say the same
 * thing make the consumer's undo granularity drift.
 */
export type EditIntent =
  | {
      readonly kind: "select-set";
      readonly targets: readonly EditTarget[];
      readonly additive: boolean;
    }
  | { readonly kind: "deselect" }
  /** One gesture, one undo step — a single move is a `move-set` of length 1. */
  | { readonly kind: "move-set"; readonly moves: readonly EditMove[] }
  | { readonly kind: "delete-set"; readonly targets: readonly EditTarget[] }
  | { readonly kind: "place"; readonly at: Vertex }
  | { readonly kind: "draw"; readonly at: Vertex }
  | { readonly kind: "close-ring" }
  /** End the run in progress, keeping what it has drawn. */
  | { readonly kind: "finish-run" }
  /** Abandon the run in progress. */
  | { readonly kind: "cancel-run" }
  /**
   * Continue an existing open path from one of its ends. A host whose document
   * cannot express head-extension must answer with a refusal of its own rather
   * than quietly appending to the tail.
   */
  | {
      readonly kind: "resume-drawing";
      readonly pathId: string;
      readonly endpoint: "head" | "tail";
    }
  | {
      readonly kind: "insert";
      readonly pathId: string;
      readonly afterIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "insert-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "rotate"; readonly id: string; readonly yaw: number }
  | { readonly kind: "nothing" }
  | { readonly kind: "refused"; readonly reason: string };

/** Why a resolved position is where it is, so the host can draw the reason. */
export type SnapEvidence =
  | { readonly kind: "vertex"; readonly at: Vertex; readonly target: EditTarget }
  | {
      readonly kind: "edge";
      readonly at: Vertex;
      readonly owner: EditTarget;
      readonly edgeIndex: number;
    }
  | {
      readonly kind: "align";
      readonly at: Vertex;
      readonly axis: "x" | "y";
      readonly withTarget: EditTarget;
    }
  | { readonly kind: "grid"; readonly at: Vertex };

/** A position after constraint and snapping, with the evidence for both. */
export type ResolvedPosition = {
  readonly at: Vertex;
  readonly constrained: boolean;
  readonly snap: SnapEvidence | null;
};

/** The cursor names this layer owns. A name always exists, even when the value does not. */
export type EditCursorName =
  | "grabbing"
  | "rotating"
  | "marquee"
  | "grab"
  | "move"
  | "insert"
  | "delete"
  | "select"
  | "rotate"
  | "draw"
  | "close-ring"
  | "finish-run"
  | "resume-run"
  | "pen-plus"
  | "pen-minus"
  | "not-allowed"
  | "host-resting";

/**
 * A cursor as this layer states it.
 *
 * `value === null` is the DECLARED delegation "the host's resting cursor owns
 * this" — the camera surface is the host's business (a raster view pans, a
 * perspective view orbits). It is not an unset value: the name is still
 * reported on the surface as `data-edit-cursor="host-resting"`, so a host
 * missing its own resting rule is a visible hole rather than a quiet one.
 */
export type EditCursor = {
  readonly name: EditCursorName;
  readonly value: string | null;
};

/** Every cursor name's CSS value. Total, so a new name must be given one. */
export const EDIT_CURSOR_VALUES: Readonly<Record<EditCursorName, string | null>> = {
  grabbing: "grabbing",
  rotating: EDIT_CURSORS.rotating,
  marquee: "crosshair",
  grab: "grab",
  move: "move",
  insert: "copy",
  delete: "pointer",
  select: "pointer",
  rotate: EDIT_CURSORS.rotate,
  draw: "crosshair",
  "close-ring": EDIT_CURSORS.closeRing,
  "finish-run": EDIT_CURSORS.finishRun,
  "resume-run": EDIT_CURSORS.resumeRun,
  "pen-plus": EDIT_CURSORS.penPlus,
  "pen-minus": EDIT_CURSORS.penMinus,
  "not-allowed": "not-allowed",
  "host-resting": null,
};

/** What the cursor needs to know beyond the affordance itself. */
export type EditCursorState = {
  readonly probe: EditProbe;
  /** The live drag's class, or null when no drag is live. */
  readonly dragging: GripClass | null;
};

// ---------------------------------------------------------------------------
// Selection algebra
// ---------------------------------------------------------------------------

/** Whether two targets name the same thing. */
export function sameTarget(a: EditTarget, b: EditTarget): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case "handle":
      return b.kind === "handle" && a.id === b.id;
    case "path":
      return b.kind === "path" && a.id === b.id;
    case "area":
      return b.kind === "area" && a.id === b.id;
    case "vertex":
      return b.kind === "vertex" && a.areaId === b.areaId && a.index === b.index;
  }
}

function dedupeTargets(targets: readonly EditTarget[]): readonly EditTarget[] {
  return targets.filter(
    (target, index) => !targets.slice(0, index).some((earlier) => sameTarget(earlier, target)),
  );
}

function containsTarget(targets: readonly EditTarget[], target: EditTarget): boolean {
  return targets.some((candidate) => sameTarget(candidate, target));
}

/** Whether this target is in the selection. */
export function isSelected(selection: EditSelection, target: EditTarget): boolean {
  return containsTarget(selection.targets, target);
}

/**
 * The one entry point that produces a selection, maintaining G1–G3.
 *
 * @param selection The selection as it stands.
 * @param targets The targets the gesture named, in the order it named them.
 * @param additive Whether each named target TOGGLES in the existing selection.
 * @returns The next selection.
 */
export function selectTargets(
  selection: EditSelection,
  targets: readonly EditTarget[],
  additive: boolean,
): EditSelection {
  const named = dedupeTargets(targets);
  if (!additive) {
    return { targets: named, primary: named[named.length - 1] ?? null };
  }
  const next = named.reduce<readonly EditTarget[]>(
    (accumulated, target) =>
      containsTarget(accumulated, target)
        ? accumulated.filter((candidate) => !sameTarget(candidate, target))
        : [...accumulated, target],
    selection.targets,
  );
  const lastAdded = [...named].reverse().find((target) => containsTarget(next, target)) ?? null;
  const keptPrimary =
    selection.primary !== null && containsTarget(next, selection.primary)
      ? selection.primary
      : null;
  return { targets: next, primary: lastAdded ?? keptPrimary ?? next[next.length - 1] ?? null };
}

/** Whether the scene still contains this target (G4). */
function targetExists(scene: EditScene, target: EditTarget): boolean {
  switch (target.kind) {
    case "handle":
      return scene.handles.some((handle) => handle.id === target.id);
    case "path":
      return scene.paths.some((path) => path.id === target.id);
    case "area":
      return scene.areas.some((area) => area.id === target.id);
    case "vertex": {
      const area = scene.areas.find((candidate) => candidate.id === target.areaId);
      return area !== undefined && target.index >= 0 && target.index < area.ring.length;
    }
  }
}

/**
 * Drop targets the scene no longer contains (G4).
 *
 * @param selection The selection as it stands.
 * @param scene The scene as it stands now.
 * @returns The selection with vanished targets removed.
 */
export function pruneSelection(selection: EditSelection, scene: EditScene): EditSelection {
  const targets = selection.targets.filter((target) => targetExists(scene, target));
  if (targets.length === selection.targets.length) {
    const primaryLives =
      selection.primary === null || targetExists(scene, selection.primary);
    return primaryLives ? selection : { targets, primary: targets[targets.length - 1] ?? null };
  }
  const primary =
    selection.primary !== null && containsTarget(targets, selection.primary)
      ? selection.primary
      : targets[targets.length - 1] ?? null;
  return { targets, primary };
}

// ---------------------------------------------------------------------------
// Scene reading
// ---------------------------------------------------------------------------

function handlePosition(handle: Handle): Vertex {
  return { x: handle.x, y: handle.y };
}

/** Resolve a path's ordered handles, dropping ids absent from the scene. */
function pathPoints(scene: EditScene, path: HittablePath): readonly Handle[] {
  return path.handleIds.flatMap((id) => {
    const handle = scene.handles.find((candidate) => candidate.id === id);
    return handle === undefined ? [] : [handle];
  });
}

function areaById(scene: EditScene, id: string): HittableArea | undefined {
  return scene.areas.find((area) => area.id === id);
}

/** The world position of a leaf target, or null when the scene lost it. */
export function targetPosition(scene: EditScene, target: EditTarget): Vertex | null {
  if (target.kind === "handle") {
    const handle = scene.handles.find((candidate) => candidate.id === target.id);
    return handle === undefined ? null : handlePosition(handle);
  }
  if (target.kind === "vertex") {
    return areaById(scene, target.areaId)?.ring[target.index] ?? null;
  }
  return null;
}

/**
 * The LEAF targets of one target: the points a move actually moves.
 *
 * An area is its ring's vertices, a path is its handles; a handle and a vertex
 * are their own leaves.
 */
export function leafTargets(scene: EditScene, target: EditTarget): readonly EditTarget[] {
  if (target.kind === "handle" || target.kind === "vertex") {
    return [target];
  }
  if (target.kind === "area") {
    const area = areaById(scene, target.id);
    return area === undefined
      ? []
      : area.ring.map((_vertex, index) => ({ kind: "vertex", areaId: area.id, index }) as const);
  }
  const path = scene.paths.find((candidate) => candidate.id === target.id);
  return path === undefined
    ? []
    : pathPoints(scene, path).map((handle) => ({ kind: "handle", id: handle.id }) as const);
}

/** Whether a path is armed: itself selected, or any of its handles selected. */
function pathIsArmed(probe: EditProbe, path: HittablePath): boolean {
  if (containsTarget(probe.selection.targets, { kind: "path", id: path.id })) {
    return true;
  }
  return probe.selection.targets.some(
    (target) => target.kind === "handle" && path.handleIds.includes(target.id),
  );
}

/** Whether an area is armed: itself selected, or any of its vertices selected. */
function areaIsArmed(probe: EditProbe, area: HittableArea): boolean {
  if (containsTarget(probe.selection.targets, { kind: "area", id: area.id })) {
    return true;
  }
  return probe.selection.targets.some(
    (target) => target.kind === "vertex" && target.areaId === area.id,
  );
}

// ---------------------------------------------------------------------------
// Distance decisions
// ---------------------------------------------------------------------------

/** Scale one pick radius for the pointer modality. Anchors never scale. */
function pickRadius(radiusM: number, modality: PointerModality): number {
  return radiusM * (modality === "coarse" ? COARSE_PICK_SCALE : 1);
}

/** A winner within one class, and how far away it was in the declared frame. */
type Ranked = { readonly index: number; readonly distance: number };

/**
 * The one distance-decision seam for every point-like candidate.
 *
 * A screen-space surface owns the pointer frame, including its radii and
 * coarse scale. Once it declares that frame, a null answer is authoritative;
 * the metric path is never consulted as a fallback. The returned distance is
 * in whichever frame answered, which is the frame every comparison in one
 * probe uses.
 */
function rank(
  probe: EditProbe,
  klass: EditPickClass,
  candidates: readonly Vertex[],
  toleranceM: number,
): Ranked | null {
  if (candidates.length === 0) {
    return null;
  }
  if (probe.screenRank !== undefined) {
    const answer = probe.screenRank(klass, candidates, probe.modality);
    if (
      answer === null ||
      !Number.isInteger(answer.index) ||
      answer.index < 0 ||
      answer.index >= candidates.length ||
      !Number.isFinite(answer.distancePx) ||
      answer.distancePx < 0
    ) {
      return null;
    }
    return { index: answer.index, distance: answer.distancePx };
  }
  const radius = pickRadius(toleranceM, probe.modality);
  return candidates
    .map((candidate, index) => ({
      index,
      distance: Math.hypot(candidate.x - probe.at.x, candidate.y - probe.at.y),
    }))
    .filter((hit) => hit.distance <= radius)
    .sort((left, right) => left.distance - right.distance)[0] ?? null;
}

/**
 * A point class's candidates, resolved into affordances.
 *
 * Point classes are arbitrated against each other by DISTANCE, not by a fixed
 * order: a badge whose disc overlaps the next waypoint must not take that
 * waypoint's press, and a heading knob at the end of its arm must not take the
 * press of the vertex it happens to lie on (both were real defects of the
 * fixed order). Exact ties break in the order below, which is deterministic
 * and keeps the answers a coincident stack gave before.
 */
const POINT_TIE_ORDER = [
  "badge",
  "knob",
  "run-first",
  "run-last",
  "path-endpoint",
  "handle",
  "vertex",
] as const;

type PointCandidate = { readonly at: Vertex; readonly make: () => EditAffordance };

type PointGroup = {
  readonly tie: (typeof POINT_TIE_ORDER)[number];
  readonly klass: EditPickClass;
  readonly toleranceM: number;
  readonly candidates: readonly PointCandidate[];
};

function nearestPoint(probe: EditProbe, groups: readonly PointGroup[]): EditAffordance | null {
  const picks = groups.flatMap((group) => {
    const ranked = rank(
      probe,
      group.klass,
      group.candidates.map((candidate) => candidate.at),
      group.toleranceM,
    );
    const winner = ranked === null ? undefined : group.candidates[ranked.index];
    return ranked === null || winner === undefined
      ? []
      : [
          {
            distance: ranked.distance,
            tie: POINT_TIE_ORDER.indexOf(group.tie),
            make: winner.make,
          },
        ];
  });
  const best = picks.sort(
    (left, right) => left.distance - right.distance || left.tie - right.tie,
  )[0];
  return best === undefined ? null : best.make();
}

// ---------------------------------------------------------------------------
// Candidate groups
// ---------------------------------------------------------------------------

/**
 * The delete badges under this probe — COARSE INPUT ONLY.
 *
 * A fine pointer has no badge at all (invariant A'): it removes with Alt-click
 * on the vertex, with Delete on the selection, or with the host's native twin
 * control. That is what removes the floating destructive target from beside
 * every precise gesture, and with it the anchor-offset workaround's reason to
 * exist in the fine frame. Coarse input keeps the badge, and keeps the 2x
 * anchor offset that stops a tap on the thing itself from deleting it.
 */
function badgeGroup(probe: EditProbe): PointGroup | null {
  if (probe.modality === "fine") {
    return null;
  }
  const anchorOffset = BADGE_ANCHOR_OFFSET_SCALE * probe.tolerance.badgeM;
  const anchorFor = (at: Vertex): Vertex =>
    probe.anchors?.badgeAt(at) ?? handleBadgeAnchor(at, anchorOffset);
  const badgeAt = (target: EditTarget, at: Vertex): PointCandidate => ({
    at,
    make: () => ({ kind: "badge", target, at }),
  });
  const candidates = probe.selection.targets.flatMap<PointCandidate>((target) => {
    if (target.kind === "handle" || target.kind === "vertex") {
      const at = targetPosition(probe.scene, target);
      return at === null ? [] : [badgeAt(target, anchorFor(at))];
    }
    if (target.kind === "area") {
      const area = areaById(probe.scene, target.id);
      if (area === undefined || area.ring.length === 0) {
        return [];
      }
      const areaBase = areaBadgeAnchor(area.ring, anchorOffset);
      return [
        badgeAt(target, probe.anchors?.badgeAt(areaBase) ?? areaBase),
        ...area.ring.map((vertex, index) =>
          badgeAt({ kind: "vertex", areaId: area.id, index }, anchorFor(vertex)),
        ),
      ];
    }
    return [];
  });
  return candidates.length === 0
    ? null
    : { tie: "badge", klass: "badge", toleranceM: probe.tolerance.badgeM, candidates };
}

/**
 * The primary handle's heading knob.
 *
 * Only the primary's, because two knobs mean nothing, and in fine input only
 * once the pointer has come within the arming radius of the handle itself — so
 * it does not hover beside a neighbouring waypoint the operator is trying to
 * grab. Coarse input has no hover to arm with and keeps it whenever selected.
 */
/**
 * The primary handle's heading knob, when the arming radius reveals it.
 *
 * This is the DRAWING answer as much as the picking one, and a host must use it
 * for both. A knob that is drawn whenever something is selected floats beside
 * every precise gesture in the neighbourhood — the interference this revision
 * removes; a knob that appears only while it is itself hovered cannot be found
 * at all. Between those, the rule is: the operator has come within `revealM` of
 * the handle the knob belongs to.
 *
 * Coarse input has no hover with which to approach anything, so a selected
 * handle keeps its knob unconditionally, exactly as before.
 *
 * @param probe The pointer probe.
 * @returns The knob's owner and position, or null when it is not revealed.
 */
export function revealedKnob(
  probe: EditProbe,
): { readonly id: string; readonly at: Vertex } | null {
  const primary = probe.selection.primary;
  if (primary === null || primary.kind !== "handle") {
    return null;
  }
  const handle = probe.scene.handles.find((candidate) => candidate.id === primary.id);
  if (handle === undefined) {
    return null;
  }
  const at = probe.anchors?.knobAt(handle) ?? headingKnobAt(handle, probe.tolerance.headingArmM);
  if (at === null) {
    return null;
  }
  if (probe.modality === "coarse") {
    return { id: handle.id, at };
  }
  // The reach is measured to the HANDLE, not to the knob: the operator arms the
  // thing, and its knob comes with it. A screen-space host answers this in its
  // own frame through the `reveal` class, because a metric reach means nothing
  // on a perspective floor (and its metric tolerances are deliberately NaN).
  const reached = rank(
    probe,
    "reveal",
    [handlePosition(handle)],
    probe.tolerance.revealM + probe.tolerance.headingArmM,
  );
  return reached === null ? null : { id: handle.id, at };
}

function knobGroup(probe: EditProbe): PointGroup | null {
  const knob = revealedKnob(probe);
  if (knob === null) {
    return null;
  }
  return {
    tie: "knob",
    klass: "knob",
    toleranceM: probe.tolerance.knobM,
    candidates: [
      { at: knob.at, make: () => ({ kind: "knob", id: knob.id, at: knob.at }) as const },
    ],
  };
}

function handleGroup(probe: EditProbe): PointGroup | null {
  if (probe.scene.handles.length === 0) {
    return null;
  }
  return {
    tie: "handle",
    klass: "handle",
    toleranceM: probe.tolerance.handleM,
    candidates: probe.scene.handles.map((handle) => ({
      at: handlePosition(handle),
      make: () => ({ kind: "handle", id: handle.id }) as const,
    })),
  };
}

/** Armed areas' ring vertices (invariant F'). */
function vertexGroup(probe: EditProbe): PointGroup | null {
  const candidates = probe.scene.areas
    .filter((area) => areaIsArmed(probe, area))
    .flatMap((area) =>
      area.ring.map((vertex, index) => ({
        at: vertex,
        make: () => ({ kind: "vertex", areaId: area.id, index }) as const,
      })),
    );
  return candidates.length === 0
    ? null
    : { tie: "vertex", klass: "vertex", toleranceM: probe.tolerance.handleM, candidates };
}

/** The run's first point, which closes the ring. */
function runFirstGroup(probe: EditProbe): PointGroup | null {
  const first = probe.drawing?.[0];
  if (first === undefined || probe.mode !== "draw-area") {
    return null;
  }
  return {
    tie: "run-first",
    klass: "vertex",
    toleranceM: probe.tolerance.handleM,
    candidates: [{ at: first, make: () => ({ kind: "run-first", at: first }) as const }],
  };
}

/** The run's last point, which ends the run. */
function runLastGroup(probe: EditProbe): PointGroup | null {
  const run = probe.drawing;
  if (run === undefined || run === null || run.length === 0) {
    return null;
  }
  const last = run[run.length - 1];
  if (last === undefined) {
    return null;
  }
  return {
    tie: "run-last",
    klass: "vertex",
    toleranceM: probe.tolerance.handleM,
    candidates: [{ at: last, make: () => ({ kind: "run-last", at: last }) as const }],
  };
}

/**
 * Existing open paths' ends, while append is armed and no run has started.
 *
 * Clicking one continues that path from that end, which is the pen's
 * established way of picking a route back up rather than starting a new one.
 */
function pathEndpointGroup(probe: EditProbe): PointGroup | null {
  if (probe.mode !== "append") {
    return null;
  }
  if (probe.drawing !== null && probe.drawing.length > 0) {
    return null;
  }
  const candidates = probe.scene.paths.flatMap((path) => {
    const points = pathPoints(probe.scene, path);
    const head = points[0];
    const tail = points[points.length - 1];
    if (head === undefined || tail === undefined || points.length < 2) {
      return [];
    }
    return [
      {
        at: handlePosition(head),
        make: () =>
          ({
            kind: "path-endpoint",
            pathId: path.id,
            endpoint: "head",
            at: handlePosition(head),
          }) as const,
      },
      {
        at: handlePosition(tail),
        make: () =>
          ({
            kind: "path-endpoint",
            pathId: path.id,
            endpoint: "tail",
            at: handlePosition(tail),
          }) as const,
      },
    ];
  });
  return candidates.length === 0
    ? null
    : {
        tie: "path-endpoint",
        klass: "handle",
        toleranceM: probe.tolerance.handleM,
        candidates,
      };
}

function groupsOf(...groups: readonly (PointGroup | null)[]): readonly PointGroup[] {
  return groups.flatMap((group) => (group === null ? [] : [group]));
}

/**
 * The nearest ARMED ring edge: `ring-edge` normally, `ghost-vertex` when the
 * gesture is about to add a vertex (Alt in fine input, always in coarse).
 */
function ringEdgeUnder(probe: EditProbe): EditAffordance | null {
  const inserting = probe.modality === "coarse" || probe.modifiers.alt;
  const candidates = probe.scene.areas
    .filter((area) => areaIsArmed(probe, area))
    .flatMap((area) =>
      ringEdges(area.ring).map((edge) => ({
        areaId: area.id,
        edgeIndex: edge.index,
        at: closestPointOnSegment(edge.a, edge.b, probe.at),
      })),
    );
  const ranked = rank(
    probe,
    "ghost",
    candidates.map((candidate) => candidate.at),
    probe.tolerance.ghostM,
  );
  const winner = ranked === null ? undefined : candidates[ranked.index];
  if (winner === undefined) {
    return null;
  }
  return inserting
    ? { kind: "ghost-vertex", areaId: winner.areaId, edgeIndex: winner.edgeIndex, at: winner.at }
    : { kind: "ring-edge", areaId: winner.areaId, edgeIndex: winner.edgeIndex, at: winner.at };
}

/**
 * The nearest path segment.
 *
 * In fine input an UNARMED path offers only `path` — the affordance that
 * selects it (invariant F'). That is the fix for a camera drag near a route
 * the operator never selected quietly growing a vertex. An armed path's
 * segment is `path-edge` (drag translates it) or, with Alt, `ghost` (insert).
 * Coarse input keeps its previous answer for every path, armed or not: its
 * persistent midpoints ARE its edit affordance and there is no hover to arm
 * with.
 */
function pathSegmentUnder(probe: EditProbe): EditAffordance | null {
  const candidates = probe.scene.paths.flatMap((path) => {
    const armed = pathIsArmed(probe, path);
    return pathSegments(pathPoints(probe.scene, path)).map((segment) => ({
      pathId: path.id,
      segmentIndex: segment.index,
      armed,
      at: closestPointOnSegment(segment.a, segment.b, probe.at),
    }));
  });
  const ranked = rank(
    probe,
    "ghost",
    candidates.map((candidate) => candidate.at),
    probe.tolerance.ghostM,
  );
  const winner = ranked === null ? undefined : candidates[ranked.index];
  if (winner === undefined) {
    return null;
  }
  if (probe.modality === "coarse") {
    return {
      kind: "ghost",
      pathId: winner.pathId,
      segmentIndex: winner.segmentIndex,
      at: winner.at,
    };
  }
  if (!winner.armed) {
    return { kind: "path", id: winner.pathId };
  }
  return probe.modifiers.alt
    ? { kind: "ghost", pathId: winner.pathId, segmentIndex: winner.segmentIndex, at: winner.at }
    : {
        kind: "path-edge",
        pathId: winner.pathId,
        segmentIndex: winner.segmentIndex,
        at: winner.at,
      };
}

/**
 * The refusal a contradictory declaration earns, before anything is resolved.
 *
 * Grid snapping without a grid is not "snapping off"; it is a host that
 * declared two incompatible things, and it is told so.
 */
function declarationRefusal(probe: EditProbe): EditAffordance | null {
  if (!probe.snapping.toGrid) {
    return null;
  }
  if (probe.grid === null) {
    return {
      kind: "refused",
      reason: "Grid snapping was requested without a declared grid.",
    };
  }
  if (!isUsableGrid(probe.grid)) {
    return {
      kind: "refused",
      reason: "Grid snapping was requested with an unusable grid pitch or origin.",
    };
  }
  return null;
}

/**
 * Resolve the visible editing affordance under a pointer probe.
 *
 * Point classes (badge, knob, handle, armed ring vertex, run ends, path ends)
 * are collected together and the NEAREST wins, ties broken deterministically.
 * Only when no point is within reach are the line classes evaluated, in
 * arming order: armed ring edge, then path segment, then an area's interior,
 * then the floor. "A point beats a line" stays structural — a vertex lies ON
 * its adjacent edges, so the reverse order would make vertices unreachable.
 *
 * An armed mode exposes the floor, the run's own ends, and (in append, before
 * a run starts) an existing path's ends. Nothing else: an armed drag belongs
 * to the camera (invariant D).
 */
export function resolveAffordance(probe: EditProbe): EditAffordance {
  const refusal = declarationRefusal(probe);
  if (refusal !== null) {
    return refusal;
  }

  if (probe.mode !== "direct") {
    if (probe.mode === "draw-area" && !probe.capabilities.areas.supported) {
      return { kind: "refused", reason: probe.capabilities.areas.reason };
    }
    return (
      nearestPoint(
        probe,
        groupsOf(runFirstGroup(probe), runLastGroup(probe), pathEndpointGroup(probe)),
      ) ?? { kind: "floor" }
    );
  }

  const point = nearestPoint(
    probe,
    groupsOf(badgeGroup(probe), knobGroup(probe), handleGroup(probe), vertexGroup(probe)),
  );
  if (point !== null) {
    return point;
  }

  const ringEdge = ringEdgeUnder(probe);
  if (ringEdge !== null) {
    return ringEdge;
  }

  const pathSegment = pathSegmentUnder(probe);
  if (pathSegment !== null) {
    return pathSegment;
  }

  const interior = probe.scene.areas.find((candidate) => insideRing(candidate.ring, probe.at));
  if (interior !== undefined) {
    return { kind: "area", id: interior.id };
  }
  return { kind: "floor" };
}

// ---------------------------------------------------------------------------
// Grips
// ---------------------------------------------------------------------------

function memberFor(scene: EditScene, target: EditTarget): EditMoveMember | null {
  const from = targetPosition(scene, target);
  return from === null ? null : { target, from };
}

function membersFor(scene: EditScene, targets: readonly EditTarget[]): readonly EditMoveMember[] {
  const leaves = dedupeTargets(targets.flatMap((target) => leafTargets(scene, target)));
  return leaves.flatMap((leaf) => {
    const member = memberFor(scene, leaf);
    return member === null ? [] : [member];
  });
}

/**
 * The members a drag on `seed` moves.
 *
 * Dragging a member of a multi-selection moves the whole selection with one
 * delta and one undo step; dragging anything else moves only itself, and does
 * not disturb the selection.
 */
function moveMembers(probe: EditProbe, seed: EditTarget): readonly EditMoveMember[] {
  const inSelection = containsTarget(probe.selection.targets, seed);
  const targets =
    inSelection && probe.selection.targets.length > 1 ? probe.selection.targets : [seed];
  const members = membersFor(probe.scene, targets);
  if (!inSelection || members.length === 0) {
    return members;
  }
  // The seeded leaf leads, so the anchor a constraint and a snap are measured
  // against is the point the operator actually grabbed.
  const seedLeaves = membersFor(probe.scene, [seed]);
  const rest = members.filter(
    (member) => !seedLeaves.some((leaf) => sameTarget(leaf.target, member.target)),
  );
  return [...seedLeaves, ...rest];
}

function moveSet(probe: EditProbe, seed: EditTarget): DragGrip | null {
  const members = moveMembers(probe, seed);
  return members.length === 0 ? null : { kind: "move-set", members, origin: probe.at };
}

/** The two endpoint handles of one resolved path segment. */
function segmentMembers(
  scene: EditScene,
  pathId: string,
  segmentIndex: number,
): readonly EditMoveMember[] {
  const path = scene.paths.find((candidate) => candidate.id === pathId);
  if (path === undefined) {
    return [];
  }
  const points = pathPoints(scene, path);
  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  if (a === undefined || b === undefined) {
    return [];
  }
  return [
    { target: { kind: "handle", id: a.id }, from: handlePosition(a) },
    { target: { kind: "handle", id: b.id }, from: handlePosition(b) },
  ];
}

/** The two endpoint vertices of one ring edge, including the wrap-around. */
function ringEdgeMembers(
  scene: EditScene,
  areaId: string,
  edgeIndex: number,
): readonly EditMoveMember[] {
  const area = areaById(scene, areaId);
  if (area === undefined || area.ring.length < 2) {
    return [];
  }
  const nextIndex = (edgeIndex + 1) % area.ring.length;
  const a = area.ring[edgeIndex];
  const b = area.ring[nextIndex];
  if (a === undefined || b === undefined) {
    return [];
  }
  return [
    { target: { kind: "vertex", areaId, index: edgeIndex }, from: a },
    { target: { kind: "vertex", areaId, index: nextIndex }, from: b },
  ];
}

/**
 * Whether Shift over this affordance means "rubber-band a rectangle" rather
 * than "constrain a move". The marquee replaces a gesture that would
 * otherwise have gone to the camera, never one that edits.
 */
function marqueeStartsHere(affordance: EditAffordance, probe: EditProbe): boolean {
  if (!probe.modifiers.shift) {
    return false;
  }
  if (affordance.kind === "floor" || affordance.kind === "none" || affordance.kind === "path") {
    return true;
  }
  return (
    affordance.kind === "area" &&
    !containsTarget(probe.selection.targets, { kind: "area", id: affordance.id })
  );
}

/** What a direct press takes hold of; armed-mode drags always belong to the camera. */
export function resolveGrip(probe: EditProbe): DragGrip | null {
  if (declarationRefusal(probe) !== null) {
    return null;
  }
  if (probe.mode !== "direct") {
    return null;
  }
  const affordance = resolveAffordance(probe);
  if (marqueeStartsHere(affordance, probe)) {
    return { kind: "marquee", from: probe.at, additive: true };
  }
  switch (affordance.kind) {
    case "knob": {
      const handle = probe.scene.handles.find((candidate) => candidate.id === affordance.id);
      return handle === undefined
        ? null
        : { kind: "rotate", id: handle.id, origin: handlePosition(handle) };
    }
    case "handle":
      return moveSet(probe, { kind: "handle", id: affordance.id });
    case "vertex":
      return moveSet(probe, {
        kind: "vertex",
        areaId: affordance.areaId,
        index: affordance.index,
      });
    case "path-edge": {
      const members = segmentMembers(probe.scene, affordance.pathId, affordance.segmentIndex);
      return members.length === 0
        ? null
        : { kind: "move-set", members, origin: probe.at };
    }
    case "ring-edge": {
      const members = ringEdgeMembers(probe.scene, affordance.areaId, affordance.edgeIndex);
      return members.length === 0
        ? null
        : { kind: "move-set", members, origin: probe.at };
    }
    case "ghost":
      return {
        kind: "insert",
        pathId: affordance.pathId,
        afterIndex: affordance.segmentIndex,
        at: affordance.at,
      };
    case "ghost-vertex":
      return {
        kind: "insert-vertex",
        areaId: affordance.areaId,
        edgeIndex: affordance.edgeIndex,
        at: affordance.at,
      };
    case "area":
      return containsTarget(probe.selection.targets, { kind: "area", id: affordance.id })
        ? moveSet(probe, { kind: "area", id: affordance.id })
        : null;
    case "none":
    case "badge":
    case "path":
    case "run-first":
    case "run-last":
    case "path-endpoint":
    case "floor":
    case "refused":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Constraint and snapping
// ---------------------------------------------------------------------------

/** The unit direction of the 45-degree ray a constrained drag rides. */
function constraintAxis(origin: Vertex, raw: Vertex): Vertex | null {
  const dx = raw.x - origin.x;
  const dy = raw.y - origin.y;
  if (Math.hypot(dx, dy) === 0) {
    return null;
  }
  const angle = snapAngle(Math.atan2(dy, dx), AXIS_STEP_RAD);
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function projectOnAxis(origin: Vertex, axis: Vertex, at: Vertex): Vertex {
  const travelled = (at.x - origin.x) * axis.x + (at.y - origin.y) * axis.y;
  return { x: origin.x + travelled * axis.x, y: origin.y + travelled * axis.y };
}

type SnapCandidate = { readonly at: Vertex; readonly evidence: SnapEvidence };

type SnapGroup = { readonly candidates: readonly SnapCandidate[] };

/**
 * Every vertex-like snap target in the scene, excluding what is being moved.
 *
 * Excluding the moved targets is what keeps a drag from snapping to the very
 * point it is dragging.
 */
function snapVertices(
  scene: EditScene,
  exclude: readonly EditTarget[],
): readonly { readonly at: Vertex; readonly target: EditTarget }[] {
  const handles = scene.handles.map((handle) => ({
    at: handlePosition(handle),
    target: { kind: "handle", id: handle.id } as const,
  }));
  const vertices = scene.areas.flatMap((area) =>
    area.ring.map((vertex, index) => ({
      at: vertex,
      target: { kind: "vertex", areaId: area.id, index } as const,
    })),
  );
  return [...handles, ...vertices].filter(
    (candidate) => !containsTarget(exclude, candidate.target),
  );
}

function snapEdgeCandidates(
  scene: EditScene,
  exclude: readonly EditTarget[],
  raw: Vertex,
): readonly SnapCandidate[] {
  const pathEdges = scene.paths.flatMap((path) => {
    const points = pathPoints(scene, path);
    return pathSegments(points).flatMap((segment) => {
      const endpoints = [points[segment.index], points[segment.index + 1]];
      const touched = endpoints.some(
        (handle) =>
          handle !== undefined && containsTarget(exclude, { kind: "handle", id: handle.id }),
      );
      if (touched) {
        return [];
      }
      const at = closestPointOnSegment(segment.a, segment.b, raw);
      return [
        {
          at,
          evidence: {
            kind: "edge",
            at,
            owner: { kind: "path", id: path.id },
            edgeIndex: segment.index,
          } as const,
        },
      ];
    });
  });
  const areaEdges = scene.areas.flatMap((area) =>
    ringEdges(area.ring).flatMap((edge) => {
      const nextIndex = (edge.index + 1) % area.ring.length;
      const touched = [edge.index, nextIndex].some((index) =>
        containsTarget(exclude, { kind: "vertex", areaId: area.id, index }),
      );
      if (touched) {
        return [];
      }
      const at = closestPointOnSegment(edge.a, edge.b, raw);
      return [
        {
          at,
          evidence: {
            kind: "edge",
            at,
            owner: { kind: "area", id: area.id },
            edgeIndex: edge.index,
          } as const,
        },
      ];
    }),
  );
  return [...pathEdges, ...areaEdges];
}

function snapAlignCandidates(
  scene: EditScene,
  exclude: readonly EditTarget[],
  reference: Vertex,
): readonly SnapCandidate[] {
  return snapVertices(scene, exclude).flatMap((candidate) => [
    {
      at: { x: candidate.at.x, y: reference.y },
      evidence: {
        kind: "align",
        at: { x: candidate.at.x, y: reference.y },
        axis: "x",
        withTarget: candidate.target,
      } as const,
    },
    {
      at: { x: reference.x, y: candidate.at.y },
      evidence: {
        kind: "align",
        at: { x: reference.x, y: candidate.at.y },
        axis: "y",
        withTarget: candidate.target,
      } as const,
    },
  ]);
}

/**
 * Where a moved or placed position actually lands, and why.
 *
 * The order of decision is declared, not emergent:
 *
 *  1. Shift constrains. The constraint states the set of ALLOWED positions
 *     (the 45-degree ray from the gesture's origin), so it comes first.
 *  2. If the magnet is on, snap candidates are projected onto that allowed set
 *     and the nearest to the raw pointer within `snapM` wins, in the priority
 *     vertex > edge > align > grid — a point beats a line, a line beats an
 *     axis, an axis beats the grid.
 *  3. Otherwise the constrained position, or the raw one.
 *
 * The evidence is returned for DRAWING, never folded into the intent: a
 * document receives coordinates, not the story of how they were chosen.
 *
 * A contradictory grid declaration is refused upstream (see
 * {@link resolveAffordance}), so grid snapping here simply has no candidates
 * when no usable grid was declared.
 *
 * @param raw The unmodified pointer position.
 * @param context The gesture origin (null when there is none), the probe, and the targets to exclude from snapping.
 * @returns The resolved position with its constraint and snap evidence.
 */
export function resolvePosition(
  raw: Vertex,
  context: {
    readonly origin: Vertex | null;
    readonly probe: EditProbe;
    readonly exclude: readonly EditTarget[];
  },
): ResolvedPosition {
  const { origin, probe, exclude } = context;
  const constrained = probe.modifiers.shift && origin !== null;
  const axis = constrained && origin !== null ? constraintAxis(origin, raw) : null;
  const constrainedAt =
    constrained && origin !== null ? constrainToAxes(origin, raw, AXIS_STEP_RAD) : raw;
  if (!probe.snapping.enabled) {
    return { at: constrainedAt, constrained, snap: null };
  }

  const project = (at: Vertex): Vertex =>
    axis !== null && origin !== null ? projectOnAxis(origin, axis, at) : at;

  const geometryGroups: readonly SnapGroup[] = probe.snapping.toGeometry
    ? [
        {
          candidates: snapVertices(probe.scene, exclude).map((candidate) => ({
            at: candidate.at,
            evidence: { kind: "vertex", at: candidate.at, target: candidate.target } as const,
          })),
        },
        { candidates: snapEdgeCandidates(probe.scene, exclude, raw) },
        { candidates: snapAlignCandidates(probe.scene, exclude, constrainedAt) },
      ]
    : [];
  const gridGroups: readonly SnapGroup[] =
    probe.snapping.toGrid && isUsableGrid(probe.grid)
      ? [
          {
            candidates: [
              (() => {
                const at = snapToGrid(constrainedAt, probe.grid);
                return { at, evidence: { kind: "grid", at } as const };
              })(),
            ],
          },
        ]
      : [];

  const snapProbe: EditProbe = { ...probe, at: raw };
  for (const group of [...geometryGroups, ...gridGroups]) {
    const projected = group.candidates.map((candidate) => ({
      at: project(candidate.at),
      evidence: candidate.evidence,
    }));
    const ranked = rank(
      snapProbe,
      "snap",
      projected.map((candidate) => candidate.at),
      probe.tolerance.snapM,
    );
    const winner = ranked === null ? undefined : projected[ranked.index];
    if (winner !== undefined) {
      return {
        at: winner.at,
        constrained,
        snap: { ...winner.evidence, at: winner.at } as SnapEvidence,
      };
    }
  }
  return { at: constrainedAt, constrained, snap: null };
}

// ---------------------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------------------

/** What a marquee release selects, or why the host cannot have one. */
export type MarqueeOutcome =
  | { readonly kind: "targets"; readonly targets: readonly EditTarget[] }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * The targets a rectangle from `from` to `to` encloses, in SCENE order (G3).
 *
 * Handles are always candidates; a ring's vertices are candidates only while
 * that ring is armed (invariant F'). A perspective host that delegated its
 * distance frame must delegate its rectangle frame too — a world-frame
 * rectangle would be a silent approximation of a screen one, so it is refused
 * instead.
 *
 * @param probe The probe (for the scene, selection and declared frames).
 * @param from The world position the press landed on.
 * @param to The world position the pointer has reached.
 * @returns The enclosed targets, or a refusal.
 */
export function marqueeTargets(probe: EditProbe, from: Vertex, to: Vertex): MarqueeOutcome {
  if (probe.screenRank !== undefined && probe.screenMarquee === undefined) {
    return {
      kind: "refused",
      reason:
        "This surface declared a screen-space pointer frame but no marquee frame, " +
        "and a world-frame rectangle is not that frame.",
    };
  }
  const rect = rectBetween(from, to);
  const enclose = (
    klass: EditPickClass,
    candidates: readonly Vertex[],
  ): readonly number[] => {
    if (probe.screenMarquee !== undefined) {
      return probe.screenMarquee(klass, candidates, from, to).filter(
        (index) => Number.isInteger(index) && index >= 0 && index < candidates.length,
      );
    }
    return candidates.flatMap((candidate, index) =>
      insideRect(rect, candidate) ? [index] : [],
    );
  };

  const handles = probe.scene.handles.map(handlePosition);
  const handleTargets = enclose("handle", handles).flatMap((index) => {
    const handle = probe.scene.handles[index];
    return handle === undefined ? [] : [{ kind: "handle", id: handle.id } as const];
  });
  const vertexCandidates = probe.scene.areas
    .filter((area) => areaIsArmed(probe, area))
    .flatMap((area) =>
      area.ring.map((vertex, index) => ({ at: vertex, areaId: area.id, index })),
    );
  const vertexTargets = enclose(
    "vertex",
    vertexCandidates.map((candidate) => candidate.at),
  ).flatMap((index) => {
    const candidate = vertexCandidates[index];
    return candidate === undefined
      ? []
      : [{ kind: "vertex", areaId: candidate.areaId, index: candidate.index } as const];
  });
  return { kind: "targets", targets: [...handleTargets, ...vertexTargets] };
}

// ---------------------------------------------------------------------------
// Clicks
// ---------------------------------------------------------------------------

/** The refusal an open ring earns. Stated once so grammar and specs agree. */
export const AREA_MUST_CLOSE = "An area must be closed.";
/** The refusal a ring with too few corners earns when asked to close. */
export const AREA_TOO_FEW = "An area needs at least 3 corners before it can be closed.";

/** Select, toggle, isolate, or deselect — the whole non-destructive click vocabulary. */
function selectionClick(probe: EditProbe, target: EditTarget): EditIntent {
  if (probe.modifiers.shift) {
    return { kind: "select-set", targets: [target], additive: true };
  }
  const selected = containsTarget(probe.selection.targets, target);
  if (selected && probe.selection.targets.length > 1) {
    return { kind: "select-set", targets: [target], additive: false };
  }
  if (selected) {
    return { kind: "deselect" };
  }
  return { kind: "select-set", targets: [target], additive: false };
}

/**
 * What a press that stayed within drag slop means.
 *
 * In fine input this can never remove anything (invariant A'): Alt-clicking a
 * point removes it, and that is a MODIFIED click, declared and previewed by
 * the `pen-minus` cursor. In coarse input the persistent badge stays the tap
 * that deletes.
 */
export function resolveClick(probe: EditProbe): EditIntent {
  const refusal = declarationRefusal(probe);
  if (refusal !== null && refusal.kind === "refused") {
    return { kind: "refused", reason: refusal.reason };
  }

  const affordance = resolveAffordance(probe);

  if (probe.mode === "append") {
    if (affordance.kind === "path-endpoint") {
      return {
        kind: "resume-drawing",
        pathId: affordance.pathId,
        endpoint: affordance.endpoint,
      };
    }
    if (affordance.kind === "run-last") {
      return { kind: "finish-run" };
    }
    return { kind: "place", at: probe.at };
  }

  if (probe.mode === "draw-area") {
    if (!probe.capabilities.areas.supported) {
      return { kind: "refused", reason: probe.capabilities.areas.reason };
    }
    if (affordance.kind === "run-first") {
      return { kind: "close-ring" };
    }
    if (affordance.kind === "run-last") {
      return { kind: "refused", reason: AREA_MUST_CLOSE };
    }
    return { kind: "draw", at: probe.at };
  }

  switch (affordance.kind) {
    case "handle": {
      const target = { kind: "handle", id: affordance.id } as const;
      return probe.modifiers.alt && probe.modality === "fine"
        ? { kind: "delete-set", targets: [target] }
        : selectionClick(probe, target);
    }
    case "vertex": {
      const target = {
        kind: "vertex",
        areaId: affordance.areaId,
        index: affordance.index,
      } as const;
      return probe.modifiers.alt && probe.modality === "fine"
        ? { kind: "delete-set", targets: [target] }
        : selectionClick(probe, target);
    }
    case "badge":
      return { kind: "delete-set", targets: [affordance.target] };
    case "ghost":
      // Alt in fine input; coarse keeps its previous "a tap on a ghost does
      // nothing, a drag inserts" answer.
      return probe.modality === "fine" && probe.modifiers.alt
        ? {
            kind: "insert",
            pathId: affordance.pathId,
            afterIndex: affordance.segmentIndex,
            at: affordance.at,
          }
        : { kind: "nothing" };
    case "ghost-vertex":
      return probe.modality === "fine" && probe.modifiers.alt
        ? {
            kind: "insert-vertex",
            areaId: affordance.areaId,
            edgeIndex: affordance.edgeIndex,
            at: affordance.at,
          }
        : { kind: "nothing" };
    case "path":
      return selectionClick(probe, { kind: "path", id: affordance.id });
    case "area":
      return selectionClick(probe, { kind: "area", id: affordance.id });
    case "floor":
      return { kind: "deselect" };
    case "refused":
      return { kind: "refused", reason: affordance.reason };
    case "none":
    case "knob":
    case "path-edge":
    case "ring-edge":
    case "run-first":
    case "run-last":
    case "path-endpoint":
      return { kind: "nothing" };
  }
}

/**
 * What a double click means.
 *
 * Double click is ADDITIVE ONLY (invariant A'): on an armed edge it inserts a
 * vertex exactly where the operator pointed — the precise counterpart of
 * dragging a midpoint — and while armed it ends the run without placing an
 * extra point. It is never destructive, in any mode.
 *
 * Coarse input has NO double-click semantics at all, declared rather than
 * silently unhandled: a double tap is the browser's zoom gesture, and
 * competing with it would make both unreliable.
 */
export function resolveDoubleClick(probe: EditProbe): EditIntent {
  if (probe.modality === "coarse") {
    return { kind: "nothing" };
  }
  const refusal = declarationRefusal(probe);
  if (refusal !== null && refusal.kind === "refused") {
    return { kind: "refused", reason: refusal.reason };
  }

  if (probe.mode === "append") {
    return { kind: "finish-run" };
  }
  if (probe.mode === "draw-area") {
    if (!probe.capabilities.areas.supported) {
      return { kind: "refused", reason: probe.capabilities.areas.reason };
    }
    const run = probe.drawing ?? [];
    return run.length >= 3 ? { kind: "close-ring" } : { kind: "refused", reason: AREA_TOO_FEW };
  }

  const affordance = resolveAffordance(probe);
  if (affordance.kind === "path-edge" || affordance.kind === "ghost") {
    return {
      kind: "insert",
      pathId: affordance.pathId,
      afterIndex: affordance.segmentIndex,
      at: affordance.at,
    };
  }
  if (affordance.kind === "ring-edge" || affordance.kind === "ghost-vertex") {
    return {
      kind: "insert-vertex",
      areaId: affordance.areaId,
      edgeIndex: affordance.edgeIndex,
      at: affordance.at,
    };
  }
  return { kind: "nothing" };
}

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

/**
 * The move a set-drag has reached, with the constraint and snap applied.
 *
 * The FIRST member is the anchor: the constraint and the snap are computed for
 * the point the operator grabbed, and every other member takes the same delta.
 * Resolving the pointer instead would snap a position that is up to a pick
 * radius away from the thing being moved.
 *
 * @param grip The move-set grip taken at press time.
 * @param at The pointer's current world position.
 * @param context The probe, for the modifiers, magnet, grid, scene and tolerances.
 * @returns The moves and the evidence for where they landed.
 */
export function resolveMoveSet(
  grip: Extract<DragGrip, { readonly kind: "move-set" }>,
  at: Vertex,
  context: EditProbe,
): { readonly moves: readonly EditMove[]; readonly resolved: ResolvedPosition } {
  const anchor = grip.members[0];
  const rawDelta = { x: at.x - grip.origin.x, y: at.y - grip.origin.y };
  if (anchor === undefined) {
    return {
      moves: [],
      resolved: { at, constrained: false, snap: null },
    };
  }
  const rawAnchor = { x: anchor.from.x + rawDelta.x, y: anchor.from.y + rawDelta.y };
  const resolved = resolvePosition(rawAnchor, {
    origin: anchor.from,
    probe: context,
    exclude: grip.members.map((member) => member.target),
  });
  const delta = { x: resolved.at.x - anchor.from.x, y: resolved.at.y - anchor.from.y };
  return {
    moves: grip.members.map((member) => ({
      target: member.target,
      at: { x: member.from.x + delta.x, y: member.from.y + delta.y },
    })),
    resolved,
  };
}

/**
 * The position an insertion drag has reached, with constraint and snap applied.
 *
 * @param grip The insert or insert-vertex grip.
 * @param at The pointer's current world position.
 * @param context The probe.
 * @returns The resolved position.
 */
export function resolveInsertPosition(
  grip: Extract<DragGrip, { readonly kind: "insert" | "insert-vertex" }>,
  at: Vertex,
  context: EditProbe,
): ResolvedPosition {
  return resolvePosition(at, { origin: grip.at, probe: context, exclude: [] });
}

/**
 * The yaw a rotation drag has reached, quantised while Shift is held.
 *
 * @param grip The rotate grip.
 * @param at The pointer's current world position.
 * @param context The probe.
 * @returns The yaw in radians.
 */
export function resolveRotation(
  grip: Extract<DragGrip, { readonly kind: "rotate" }>,
  at: Vertex,
  context: EditProbe,
): number {
  const yaw = Math.atan2(at.y - grip.origin.y, at.x - grip.origin.x);
  return context.modifiers.shift ? snapAngle(yaw, YAW_STEP_RAD) : yaw;
}

/**
 * Turn the press-time grip and release point into one document intent.
 *
 * One gesture yields at most one intent, and therefore one undo step, however
 * many points it moved.
 *
 * @param grip The grip taken at press time.
 * @param at The release position in world metres.
 * @param context The probe at release, carrying the modifiers, magnet, grid, scene and tolerances.
 * @returns The intent.
 */
export function resolveDragRelease(grip: DragGrip, at: Vertex, context: EditProbe): EditIntent {
  switch (grip.kind) {
    case "move-set": {
      const { moves } = resolveMoveSet(grip, at, context);
      return moves.length === 0 ? { kind: "nothing" } : { kind: "move-set", moves };
    }
    case "insert": {
      const resolved = resolveInsertPosition(grip, at, context);
      return {
        kind: "insert",
        pathId: grip.pathId,
        afterIndex: grip.afterIndex,
        at: resolved.at,
      };
    }
    case "insert-vertex": {
      const resolved = resolveInsertPosition(grip, at, context);
      return {
        kind: "insert-vertex",
        areaId: grip.areaId,
        edgeIndex: grip.edgeIndex,
        at: resolved.at,
      };
    }
    case "rotate":
      return { kind: "rotate", id: grip.id, yaw: resolveRotation(grip, at, context) };
    case "marquee": {
      const outcome = marqueeTargets(context, grip.from, at);
      return outcome.kind === "refused"
        ? { kind: "refused", reason: outcome.reason }
        : { kind: "select-set", targets: outcome.targets, additive: grip.additive };
    }
  }
}

// ---------------------------------------------------------------------------
// Cursors
// ---------------------------------------------------------------------------

function cursor(name: EditCursorName): EditCursor {
  return { name, value: EDIT_CURSOR_VALUES[name] };
}

/**
 * The cursor for one affordance and gesture state.
 *
 * Every resolvable affordance has a name, and no name is `undefined`: the
 * camera surface answers `host-resting` (a declared delegation, reported as
 * `data-edit-cursor` so a host that never wrote a resting rule is visible),
 * and every other state has a shape of its own. A modifier is visible BEFORE
 * the press — holding Alt over a vertex already says `pen-minus` — which is
 * how a modified gesture becomes discoverable without documentation.
 *
 * @param affordance What is under the pointer.
 * @param state The probe and the live drag's class.
 * @returns The cursor name and its CSS value.
 */
export function cursorFor(affordance: EditAffordance, state: EditCursorState): EditCursor {
  if (state.dragging !== null) {
    switch (state.dragging) {
      case "move":
      case "insert":
        return cursor("grabbing");
      case "rotate":
        return cursor("rotating");
      case "marquee":
        return cursor("marquee");
    }
  }
  const { probe } = state;
  const alt = probe.modifiers.alt;
  switch (affordance.kind) {
    case "handle":
    case "vertex":
      return alt && probe.modality === "fine" ? cursor("pen-minus") : cursor("grab");
    case "knob":
      return cursor("rotate");
    case "ghost":
    case "ghost-vertex":
      return alt && probe.modality === "fine" ? cursor("pen-plus") : cursor("insert");
    case "path-edge":
    case "ring-edge":
      return cursor("move");
    case "badge":
      return cursor("delete");
    case "path":
      return probe.modifiers.shift ? cursor("marquee") : cursor("select");
    case "area":
      return containsTarget(probe.selection.targets, { kind: "area", id: affordance.id })
        ? cursor("move")
        : probe.modifiers.shift
          ? cursor("marquee")
          : cursor("select");
    case "run-first":
      return cursor("close-ring");
    case "run-last":
      return cursor("finish-run");
    case "path-endpoint":
      return cursor("resume-run");
    case "refused":
      return cursor("not-allowed");
    case "floor":
    case "none":
      if (probe.mode !== "direct") {
        return cursor("draw");
      }
      return probe.modifiers.shift ? cursor("marquee") : cursor("host-resting");
  }
}

/** Armed modes the artifact cannot offer, carrying the declared reason verbatim. */
export function modeRefusalsFor(
  capabilities: EditCapabilities,
): Partial<Record<EditMode, string>> {
  if (capabilities.areas.supported) {
    return {};
  }
  return { "draw-area": capabilities.areas.reason };
}

/** Midpoint ghosts drawn persistently for coarse input; fine input has hover. */
export function persistentGhosts(
  scene: EditScene,
  modality: PointerModality,
): readonly { readonly pathId: string; readonly segmentIndex: number; readonly at: Vertex }[] {
  if (modality === "fine") {
    return [];
  }
  return scene.paths.flatMap((path) =>
    pathSegments(pathPoints(scene, path)).map((segment) => ({
      pathId: path.id,
      segmentIndex: segment.index,
      at: {
        x: (segment.a.x + segment.b.x) / 2,
        y: (segment.a.y + segment.b.y) / 2,
      },
    })),
  );
}
