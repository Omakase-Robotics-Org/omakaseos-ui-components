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
 * Two invariants are structural here:
 *
 *  - Invariant A: a direct-mode CLICK can only select, deselect, delete, or do nothing.
 *    Placement, insertion, movement, and rotation require an armed mode or a
 *    completed drag.
 *  - Invariant F: ring vertices and edges are candidates only for the SELECTED
 *    area. An unselected ring exposes its interior and nothing that can deform it.
 *
 * Pure functions only: no React, DOM, renderer, pixels, wire, clock, or random.
 */

import { BADGE_ANCHOR_OFFSET_SCALE, COARSE_PICK_SCALE } from "./constants";
import {
  closestPointOnSegment,
  pathSegments,
  ringEdges,
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
export type PointerModality = "fine" | "coarse";
export type EditPickClass = "handle" | "ghost" | "knob" | "badge" | "vertex";
export type EditScreenPick = (
  klass: EditPickClass,
  candidates: readonly Vertex[],
  modality: PointerModality,
) => number | null;
export type EditAnchors = {
  readonly knobAt: (handle: Handle) => Vertex | null;
  readonly badgeAt: (at: Vertex) => Vertex;
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

export type EditTarget =
  | { readonly kind: "handle"; readonly id: string }
  | { readonly kind: "area"; readonly id: string };
export type EditSelection = EditTarget | null;

export type EditTolerances = {
  readonly handleM: number;
  readonly ghostM: number;
  readonly knobM: number;
  readonly badgeM: number;
  readonly headingArmM: number;
};

export type EditProbe = {
  readonly mode: EditMode;
  readonly modality: PointerModality;
  readonly scene: EditScene;
  readonly selection: EditSelection;
  readonly at: Vertex;
  readonly tolerance: EditTolerances;
  readonly capabilities: EditCapabilities;
  /** The ring being drawn, used to detect a press on its first vertex. */
  readonly drawing: readonly Vertex[] | null;
  readonly screenPick?: EditScreenPick;
  readonly anchors?: EditAnchors;
};

export type EditAffordance =
  | { readonly kind: "none" }
  | { readonly kind: "handle"; readonly id: string }
  | {
      readonly kind: "badge";
      readonly target:
        | EditTarget
        | { readonly kind: "vertex"; readonly areaId: string; readonly index: number };
      readonly at: Vertex;
    }
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
  | { readonly kind: "vertex"; readonly areaId: string; readonly index: number }
  | { readonly kind: "area"; readonly id: string }
  | { readonly kind: "floor" }
  | { readonly kind: "refused"; readonly reason: string };

export type DragGrip =
  | { readonly kind: "handle"; readonly id: string }
  | { readonly kind: "vertex"; readonly areaId: string; readonly index: number }
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
  | { readonly kind: "rotate"; readonly id: string; readonly origin: Vertex };

export type EditIntent =
  | { readonly kind: "select"; readonly target: EditTarget }
  | { readonly kind: "deselect" }
  | { readonly kind: "place"; readonly at: Vertex }
  | { readonly kind: "draw"; readonly at: Vertex }
  | { readonly kind: "close-ring" }
  | { readonly kind: "move"; readonly id: string; readonly at: Vertex }
  | {
      readonly kind: "insert";
      readonly pathId: string;
      readonly afterIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "move-vertex";
      readonly areaId: string;
      readonly index: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "insert-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "rotate"; readonly id: string; readonly yaw: number }
  | { readonly kind: "delete-handle"; readonly id: string }
  | { readonly kind: "delete-vertex"; readonly areaId: string; readonly index: number }
  | { readonly kind: "delete-area"; readonly id: string }
  | { readonly kind: "nothing" }
  | { readonly kind: "refused"; readonly reason: string };

type BadgeTarget = Extract<EditAffordance, { readonly kind: "badge" }>["target"];

type BadgeCandidate = {
  readonly target: BadgeTarget;
  readonly at: Vertex;
};

type GhostCandidate = {
  readonly pathId: string;
  readonly segmentIndex: number;
  readonly at: Vertex;
};

/** Scale one pick radius for the pointer modality. Anchors never scale. */
function pickRadius(radiusM: number, modality: PointerModality): number {
  return radiusM * (modality === "coarse" ? COARSE_PICK_SCALE : 1);
}

/**
 * The one distance-decision seam for every point-like affordance.
 *
 * A screen-space surface owns the pointer frame, including its radii and
 * coarse scale. Once it declares that frame, a null answer is authoritative;
 * the metric path is never consulted as a fallback.
 */
function pickIndex(
  probe: EditProbe,
  klass: EditPickClass,
  candidates: readonly Vertex[],
  toleranceM: number,
): number | null {
  if (candidates.length === 0) {
    return null;
  }
  if (probe.screenPick !== undefined) {
    const index = probe.screenPick(klass, candidates, probe.modality);
    return index !== null && Number.isInteger(index) && index >= 0 && index < candidates.length
      ? index
      : null;
  }
  const radius = pickRadius(toleranceM, probe.modality);
  const hits = candidates
    .map((candidate, index) => ({
      index,
      distance: Math.hypot(candidate.x - probe.at.x, candidate.y - probe.at.y),
    }))
    .filter((hit) => hit.distance <= radius)
    .sort((left, right) => left.distance - right.distance);
  return hits[0]?.index ?? null;
}

/** Resolve a path's ordered handle ids, dropping ids absent from the scene. */
function pathPoints(scene: EditScene, path: HittablePath): readonly Handle[] {
  return path.handleIds.flatMap((id) => {
    const handle = scene.handles.find((candidate) => candidate.id === id);
    return handle === undefined ? [] : [handle];
  });
}

/** The selected handle, when it remains present in this scene. */
function selectedHandle(probe: EditProbe): Handle | null {
  if (probe.selection?.kind !== "handle") {
    return null;
  }
  const id = probe.selection.id;
  return probe.scene.handles.find((handle) => handle.id === id) ?? null;
}

/** The selected area, when it remains present in this scene. */
function selectedArea(probe: EditProbe): HittableArea | null {
  if (probe.selection?.kind !== "area") {
    return null;
  }
  const id = probe.selection.id;
  return probe.scene.areas.find((area) => area.id === id) ?? null;
}

function handlePosition(handle: Handle): Vertex {
  return { x: handle.x, y: handle.y };
}

/**
 * The nearest selected-object badge under this probe.
 *
 * Anchors sit at BADGE_ANCHOR_OFFSET_SCALE x the pick radius so the badge's
 * pick disc never covers its own target's center — clicking the selected
 * thing itself stays "deselect", never "delete" (see constants.ts).
 */
function badgeUnder(probe: EditProbe): Extract<EditAffordance, { readonly kind: "badge" }> | null {
  const anchorOffset = BADGE_ANCHOR_OFFSET_SCALE * probe.tolerance.badgeM;
  const handle = selectedHandle(probe);
  const handlePos = handle === null ? null : handlePosition(handle);
  const handleAnchor = handlePos === null
    ? null
    : probe.anchors?.badgeAt(handlePos) ?? handleBadgeAnchor(handlePos, anchorOffset);
  const handleCandidates: readonly BadgeCandidate[] =
    handle === null || handleAnchor === null
      ? []
      : [
          {
            target: { kind: "handle", id: handle.id },
            at: handleAnchor,
          },
        ];
  const area = selectedArea(probe);
  const areaBase = area !== null && area.ring.length > 0
    ? areaBadgeAnchor(area.ring, anchorOffset)
    : null;
  const areaAnchor = areaBase === null
    ? null
    : probe.anchors?.badgeAt(areaBase) ?? areaBase;
  const areaCandidates: readonly BadgeCandidate[] = area === null
    ? []
    : [
        ...(areaAnchor === null
          ? []
          : [
              {
                target: { kind: "area" as const, id: area.id },
                at: areaAnchor,
              },
            ]),
        ...area.ring.map((vertex, index) => {
          const at = probe.anchors?.badgeAt(vertex) ?? handleBadgeAnchor(vertex, anchorOffset);
          return {
            target: { kind: "vertex" as const, areaId: area.id, index },
            at,
          };
        }),
      ];
  const candidates = [...handleCandidates, ...areaCandidates];
  const index = pickIndex(
    probe,
    "badge",
    candidates.map((candidate) => candidate.at),
    probe.tolerance.badgeM,
  );
  const nearest = index === null ? undefined : candidates[index];
  return nearest === undefined
    ? null
    : { kind: "badge", target: nearest.target, at: nearest.at };
}

/** The selected handle's heading knob under this probe. */
function knobUnder(probe: EditProbe): Extract<EditAffordance, { readonly kind: "knob" }> | null {
  const handle = selectedHandle(probe);
  if (handle === null) {
    return null;
  }
  const at = probe.anchors?.knobAt(handle) ?? headingKnobAt(handle, probe.tolerance.headingArmM);
  if (at === null) {
    return null;
  }
  const index = pickIndex(probe, "knob", [at], probe.tolerance.knobM);
  return index !== null
    ? { kind: "knob", id: handle.id, at }
    : null;
}

/** The nearest open-path segment under this probe. */
function ghostUnder(probe: EditProbe): Extract<EditAffordance, { readonly kind: "ghost" }> | null {
  const candidates: readonly GhostCandidate[] = probe.scene.paths.flatMap((path) => {
    return pathSegments(pathPoints(probe.scene, path)).map((segment) => ({
      pathId: path.id,
      segmentIndex: segment.index,
      at: closestPointOnSegment(segment.a, segment.b, probe.at),
    }));
  });
  const index = pickIndex(
    probe,
    "ghost",
    candidates.map((candidate) => candidate.at),
    probe.tolerance.ghostM,
  );
  const nearest = index === null ? undefined : candidates[index];
  return nearest === undefined
    ? null
    : {
        kind: "ghost",
        pathId: nearest.pathId,
        segmentIndex: nearest.segmentIndex,
        at: nearest.at,
      };
}

/**
 * Resolve the visible editing affordance under a pointer probe.
 *
 * Direct mode evaluates the fixed order badge, knob, handle, selected-ring
 * vertex, selected-ring edge, path segment, area interior, floor. A grabbable
 * point always beats a segment ghost — a vertex lies ON its adjacent edges, so
 * the reverse order would make vertices unreachable (the edge hit is distance
 * zero at the vertex itself). Armed modes expose only floor, except a refused
 * draw-area capability.
 */
export function resolveAffordance(probe: EditProbe): EditAffordance {
  if (probe.mode !== "direct") {
    if (probe.mode === "draw-area" && !probe.capabilities.areas.supported) {
      return { kind: "refused", reason: probe.capabilities.areas.reason };
    }
    return { kind: "floor" };
  }

  const badge = badgeUnder(probe);
  if (badge !== null) {
    return badge;
  }

  const knob = knobUnder(probe);
  if (knob !== null) {
    return knob;
  }

  const handleIndex = pickIndex(
    probe,
    "handle",
    probe.scene.handles.map(handlePosition),
    probe.tolerance.handleM,
  );
  const handle = handleIndex === null ? undefined : probe.scene.handles[handleIndex];
  if (handle !== undefined) {
    return { kind: "handle", id: handle.id };
  }

  const area = selectedArea(probe);
  if (area !== null) {
    const vertexIndex = pickIndex(
      probe,
      "vertex",
      area.ring,
      probe.tolerance.handleM,
    );
    if (vertexIndex !== null) {
      return { kind: "vertex", areaId: area.id, index: vertexIndex };
    }

    const edgeCandidates = ringEdges(area.ring).map((edge) => ({
      edgeIndex: edge.index,
      at: closestPointOnSegment(edge.a, edge.b, probe.at),
    }));
    const edgeIndex = pickIndex(
      probe,
      "ghost",
      edgeCandidates.map((candidate) => candidate.at),
      probe.tolerance.ghostM,
    );
    const edge = edgeIndex === null ? undefined : edgeCandidates[edgeIndex];
    if (edge !== undefined) {
      return { kind: "ghost-vertex", areaId: area.id, edgeIndex: edge.edgeIndex, at: edge.at };
    }
  }

  const ghost = ghostUnder(probe);
  if (ghost !== null) {
    return ghost;
  }

  const interior = probe.scene.areas.find((candidate) => insideRing(candidate.ring, probe.at));
  if (interior !== undefined) {
    return { kind: "area", id: interior.id };
  }
  return { kind: "floor" };
}

/** What a direct press takes hold of; armed-mode drags always belong to the camera. */
export function resolveGrip(probe: EditProbe): DragGrip | null {
  if (probe.mode !== "direct") {
    return null;
  }
  const affordance = resolveAffordance(probe);
  if (affordance.kind === "knob") {
    const handle = probe.scene.handles.find((candidate) => candidate.id === affordance.id);
    return handle === undefined
      ? null
      : { kind: "rotate", id: handle.id, origin: { x: handle.x, y: handle.y } };
  }
  if (affordance.kind === "handle") {
    return { kind: "handle", id: affordance.id };
  }
  if (affordance.kind === "ghost-vertex") {
    return {
      kind: "insert-vertex",
      areaId: affordance.areaId,
      edgeIndex: affordance.edgeIndex,
      at: affordance.at,
    };
  }
  if (affordance.kind === "vertex") {
    return { kind: "vertex", areaId: affordance.areaId, index: affordance.index };
  }
  if (affordance.kind === "ghost") {
    return {
      kind: "insert",
      pathId: affordance.pathId,
      afterIndex: affordance.segmentIndex,
      at: affordance.at,
    };
  }
  return null;
}

/** What a press that stayed within drag slop means. */
export function resolveClick(probe: EditProbe): EditIntent {
  if (probe.mode === "append") {
    return { kind: "place", at: probe.at };
  }
  if (probe.mode === "draw-area") {
    if (!probe.capabilities.areas.supported) {
      return { kind: "refused", reason: probe.capabilities.areas.reason };
    }
    const first = probe.drawing?.[0];
    const closes =
      first !== undefined &&
      pickIndex(probe, "vertex", [first], probe.tolerance.handleM) !== null;
    return closes ? { kind: "close-ring" } : { kind: "draw", at: probe.at };
  }

  const affordance = resolveAffordance(probe);
  if (affordance.kind === "handle") {
    return probe.selection?.kind === "handle" && probe.selection.id === affordance.id
      ? { kind: "deselect" }
      : { kind: "select", target: { kind: "handle", id: affordance.id } };
  }
  if (affordance.kind === "badge") {
    if (affordance.target.kind === "handle") {
      return { kind: "delete-handle", id: affordance.target.id };
    }
    if (affordance.target.kind === "area") {
      return { kind: "delete-area", id: affordance.target.id };
    }
    return {
      kind: "delete-vertex",
      areaId: affordance.target.areaId,
      index: affordance.target.index,
    };
  }
  if (affordance.kind === "area") {
    return probe.selection?.kind === "area" && probe.selection.id === affordance.id
      ? { kind: "deselect" }
      : { kind: "select", target: { kind: "area", id: affordance.id } };
  }
  if (affordance.kind === "floor") {
    return { kind: "deselect" };
  }
  if (affordance.kind === "refused") {
    return { kind: "refused", reason: affordance.reason };
  }
  return { kind: "nothing" };
}

/** Turn the press-time grip and release point into one document intent. */
export function resolveDragRelease(grip: DragGrip, at: Vertex): EditIntent {
  if (grip.kind === "handle") {
    return { kind: "move", id: grip.id, at };
  }
  if (grip.kind === "vertex") {
    return { kind: "move-vertex", areaId: grip.areaId, index: grip.index, at };
  }
  if (grip.kind === "insert") {
    return { kind: "insert", pathId: grip.pathId, afterIndex: grip.afterIndex, at };
  }
  if (grip.kind === "insert-vertex") {
    return { kind: "insert-vertex", areaId: grip.areaId, edgeIndex: grip.edgeIndex, at };
  }
  return {
    kind: "rotate",
    id: grip.id,
    yaw: Math.atan2(at.y - grip.origin.y, at.x - grip.origin.x),
  };
}

/** The direct-mode cursor vocabulary. Armed-mode crosshairs belong to the hook. */
export function cursorFor(affordance: EditAffordance, dragging: boolean): string | undefined {
  if (dragging) {
    return "grabbing";
  }
  if (affordance.kind === "handle" || affordance.kind === "vertex" || affordance.kind === "knob") {
    return "grab";
  }
  if (affordance.kind === "ghost" || affordance.kind === "ghost-vertex") {
    return "copy";
  }
  if (affordance.kind === "badge" || affordance.kind === "area") {
    return "pointer";
  }
  return undefined;
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

/** Midpoint ghosts drawn persistently for coarse input; fine input follows hover. */
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
