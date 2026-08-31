/**
 * @file The PRACTICAL map editor: the real `cuc_1_north` occupancy raster, the
 * real 22-vertex / 22-edge road graph exported from the same d1 AMR, and the
 * whole direct-manipulation grammar composed onto `<MapCanvas/>` through its
 * public API only.
 *
 * ## Why this is a module and not the body of a story
 *
 * There are TWO hosts for this editor and they prove different things, so it
 * cannot live inside either one:
 *
 *  - `MapCanvasEditor.stories.tsx` — the review surface. `build-storybook`
 *    only COMPILES a story, so a story is evidence that this file type-checks
 *    and nothing more.
 *  - `demo/map-canvas-demo.tsx` — the e2e fixture. The demo harness is the one
 *    thing in this repository that RUNS a real browser on every land
 *    (`repos.conf.d/ui-components.conf`'s `REPO_VERIFY_CMD`), and
 *    `spec/map-canvas.e2e.spec.ts` drives this editor there with real wheel,
 *    pointer and modifier events.
 *
 * So there is one editor, and the two hosts differ only in what they wrap it
 * in: the story renders it bare, and the demo passes {@link
 * MapCanvasEditorSurfaceProps.instrument} to publish the live state a spec has
 * to read (a document's committed coordinates, the viewport, the undo depth)
 * and cannot get out of pixels.
 *
 * This module is deliberately NOT exported from `src/index.ts`. It is a host
 * composed OF the library's primitives, not a primitive.
 *
 * ## What is editable, and by which gesture
 *
 * Every element of the scene has full CRUD, and every one of those operations
 * is reachable ON THE CANVAS. The document model and its refusals live in
 * `map-canvas/scene-document.ts`; this file is the gestures, the picture and
 * the chrome.
 *
 * | element | create | read / select | update | delete |
 * | --- | --- | --- | --- | --- |
 * | station / path point | arm **Add points**, click the floor (the pen keeps going: each click places, and joins to the last) | click it | drag to move · approach it and drag its heading knob to turn it · rename it in the selection's own field · switch station ⇄ path point | Alt-click · the selection's Remove · Delete key · the twin |
 * | line | arm **Add points** and click two vertices in turn (a click that lands on an existing vertex MEANS that vertex) | click the line | Alt-click / Alt-drag / double-click it to add a vertex (it splits in two) · the selection's Direction control cycles `oneWay` and the drawn arrow follows | Alt-click a line? no — a line is removed from the selection's Remove, the Delete key or the twin |
 * | keep-out wall (2 points) | arm **Draw keep-out**, click two corners, Finish | click the segment | drag either end · insert a corner (Alt-click / double-click / the selection's Add corner) — which PROMOTES it to a polygon | the selection's Remove · Delete · the twin |
 * | keep-out polygon (3+) | arm **Draw keep-out**, click corners, click the first corner again to close | click inside it | drag a corner · drag the whole area · insert a corner · Alt-click a corner to remove it (cutting to two corners DEMOTES it to a wall) | as above |
 * | typed zone | arm **Draw zone**, pick one of the eight types, draw as above | click inside it | corner CRUD as above · retype it among the eight from the selection or the twin | as above |
 *
 * Navigation is unchanged and belongs to the canvas: drag empty floor or the
 * middle button to pan, wheel to zoom about the pointer. In an armed mode
 * every drag is the camera's (grammar invariant D), so drawing never fights
 * panning: a click places, a drag moves the picture.
 *
 * ## Why a two-point keep-out is presented to the grammar as a PATH
 *
 * The grammar offers a committed area's corners only once the area is armed,
 * and it arms an area by hit-testing its INTERIOR. A virtual wall has no
 * interior, so a wall presented as an area would be a thing an operator can
 * see and can never click. So the presentations are split by the very thing
 * that decides a keep-out's meaning — its point count: a two-point entry is
 * offered as a two-handle path (a line, which the grammar hit-tests, and which
 * this host's declared `edges` capability makes selectable), and a
 * three-or-more-point entry is offered as an area. The two are disjoint, so no
 * position is ever offered twice, and `scene-document.ts`'s ring-proxy ids
 * route the returned intent back to the entry it named.
 *
 * ## Where a destructive control may live (grammar invariant A')
 *
 * A' says a fine single click on the editing surface can never remove
 * anything: removal is Alt-click, the Delete key, or the host's own native
 * control. That leaves a mouse operator with no VISIBLE cue at all, which is
 * the gap this revision closes — with chrome, not with a badge.
 *
 * {@link SelectionActions} is a native, focusable, labelled `<div role="group">`
 * of real `<button>`s, rendered as a SIBLING of `<MapCanvas/>` and positioned
 * over it near whatever is selected. It is not on the editing surface: the
 * grammar's pointer props live on the raster `<img>`, and a press on the bar
 * never reaches them, so the grammar's answer to a click on the map is
 * untouched. It appears only for a selection the operator has already made —
 * one cluster for the whole selection, never one badge per element — so
 * nothing destructive floats beside a precise gesture that has not been
 * committed to. And because it is native chrome it also makes every operation
 * keyboard reachable, which the decorative canvas cannot be.
 *
 * ## The native twin
 *
 * The canvas is a picture with decorative SVG over it: it takes no focus and
 * carries no ARIA. The twin beside it is the keyboard and assistive-technology
 * route, and that contract is not negotiable. What HAS changed is that the
 * twin is no longer the PRIMARY surface: its first section is an inspector for
 * the current selection (its properties, its verbs), and the element lists
 * below it are collapsible groups per element kind with their counts on the
 * summary — not one flat wall of every point and every line in the scene.
 *
 * ## Screen-constant affordances
 *
 * The overlay is drawn in the raster's own pixel space, so every radius, arm
 * length and pick tolerance is multiplied by the canvas' `scale` (raster units
 * per screen pixel) on its way in. A 9 px handle is 9 px at 0.3x and at 8x.
 *
 * ## Why the drawn objects carry `data-*` identities
 *
 * The overlay is `aria-hidden` decorative SVG, so a circle at (412, 233) is
 * otherwise anonymous to anything outside this file's closure — a reviewer
 * inspecting the DOM, and the e2e that has to measure ONE nominated handle's
 * rendered box across a zoom, alike.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Button,
  ButtonRow,
  EditGhostHandle,
  EditHandle,
  EditHeadingKnob,
  EditMarquee,
  EditRubberBand,
  EditSnapGuide,
  Input,
  Select,
} from "./index";
import { MapCanvas, useMapCanvasProjector } from "./MapCanvas";
import {
  BADGE_PICK_RADIUS_PX,
  EMPTY_SELECTION,
  GHOST_PICK_RADIUS_PX,
  HANDLE_PICK_RADIUS_PX,
  KNOB_PICK_RADIUS_PX,
  REVEAL_RADIUS_PX,
  SNAP_RADIUS_PX,
  beginSession,
  commitEdit,
  pruneSelection,
  redoEdit,
  resolveGrip,
  sameTarget,
  selectTargets,
  undoEdit,
  useDirectEditSurface,
  useEditCommandKeys,
} from "./direct-manipulation";
import type {
  EditIntent,
  EditMode,
  EditProbe,
  EditScene,
  EditSelection,
  EditSession,
  EditTarget,
  EditTolerances,
  Vertex,
} from "./direct-manipulation";
import { metresPerScreenPixel, project, type MapViewport, type RasterFrame } from "./map-canvas";
import { CUC_1_NORTH_RASTER, CUC_1_NORTH_ROAD_GRAPH } from "./map-canvas/cuc-1-north.fixture";
import {
  ONE_WAY_LABELS,
  PATH_POINT_TYPE,
  SINGLE_LABELS,
  SPLICE_AREA_TYPES,
  STATION_TYPE,
  addEdge,
  addKeepOut,
  addPoint,
  addSpliceArea,
  edgeById,
  edgeLabel,
  edgeMidpoint,
  insertRingVertex,
  keepOutById,
  keepOutKindOf,
  keepOutLabel,
  moveMany,
  newKey,
  pointAt,
  pointById,
  pointLabel,
  removeMany,
  ringHandleId,
  ringOf,
  ringPathId,
  parseRingHandleId,
  parseRingPathId,
  runCentre,
  setEdgeOneWay,
  setEdgeSingle,
  setPointLabel,
  setPointType,
  setPointYaw,
  setSpliceAreaType,
  spliceAreaById,
  spliceAreaLabel,
  spliceAreaTypeLabel,
  splitEdge,
  widestRingSide,
  type OneWay,
  type RoadEdge,
  type Single,
  type RoadPoint,
  type RoadPointType,
  type SceneDocument,
  type SceneEdit,
  type SceneMove,
  type SceneRef,
} from "./map-canvas/scene-document";

const FRAME: RasterFrame = {
  pixelWidth: CUC_1_NORTH_RASTER.pixelWidth,
  pixelHeight: CUC_1_NORTH_RASTER.pixelHeight,
  resolution: CUC_1_NORTH_RASTER.resolution,
  originX: CUC_1_NORTH_RASTER.originX,
  originY: CUC_1_NORTH_RASTER.originY,
};

/** How far the heading knob sits from its station, in screen pixels. */
const HEADING_ARM_PX = 26;

/** The drawn weight of a line, in screen pixels (non-scaling stroke). */
const EDGE_WIDTH_PX = 2;
const EDGE_HOVER_WIDTH_PX = 3;
const EDGE_SELECTED_WIDTH_PX = 4;

/** The drawn weight of a keep-out wall: the thing itself, not a hint of it. */
const WALL_WIDTH_PX = 7;
const WALL_SELECTED_WIDTH_PX = 10;

/** A one-way arrow's half-length and half-width, in screen pixels. */
const ARROW_LENGTH_PX = 7;
const ARROW_HALF_WIDTH_PX = 4;

/** A station's label, in screen pixels. */
const LABEL_SIZE_PX = 11;

/** A keep-out entry's or zone's own name, drawn at its centre, in screen pixels. */
const AREA_LABEL_SIZE_PX = 10;

/** The halo that keeps a label legible over both floor and wall, in screen pixels. */
const LABEL_HALO_PX = 3;

/**
 * The clear space a station's name keeps from the mark it names, in screen
 * pixels.
 *
 * A HOST spacing choice, deliberately not a read of the affordance's own drawn
 * size: `EditHandle` owns its geometry (it takes `unitsPerPixel` and no
 * radius), so a label placed against a number this file made up about that
 * geometry would be a second opinion about the picture. This is the gap the
 * label keeps, and the box it refuses to sit on top of, stated once.
 */
const LABEL_ANCHOR_CLEAR_PX = 12;

/** Where a label sits relative to its station, in screen pixels. */
const LABEL_OFFSET_X_PX = LABEL_ANCHOR_CLEAR_PX * 1.45;
const LABEL_OFFSET_Y_PX = LABEL_ANCHOR_CLEAR_PX * 1.1;

/**
 * The clear space demanded around a label, in screen pixels.
 *
 * Half of it is the halo the label paints outside its own glyphs
 * ({@link LABEL_HALO_PX} is centred on the outline), and the rest is the gap
 * that makes two surviving labels read as two labels rather than as one
 * run-on word touching at the edges.
 */
const LABEL_CLEARANCE_PX = LABEL_HALO_PX / 2 + 2;

/** The selection bar's widest allowed box, in CSS pixels. See its clamp. */
const ACTIONS_MAX_WIDTH_PX = 300;

/** How far the selection bar sits from the thing it acts on, in CSS pixels. */
const ACTIONS_OFFSET_PX = 18;

/** The bar's reserved height for the clamp that keeps it inside the viewport. */
const ACTIONS_RESERVED_HEIGHT_PX = 96;

/** The document model's types, under the names this host has always exported. */
export type EditorPoint = RoadPoint;
export type EditorEdge = RoadEdge;
export type EditorDocument = SceneDocument;

/**
 * The scene the editor opens on.
 *
 * The raster and the road graph are REAL: machine-parsed from one d1 AMR's
 * `cuc_1_north-0826-01` export (see `cuc-1-north.fixture.ts`). That export
 * carries no forbidden areas, so the keep-out entries and the typed zones
 * below are ILLUSTRATIVE — authored here, positioned relative to named
 * stations so they land on the mapped floor, and present because an editor
 * that opens with none of an element kind cannot show what that kind looks
 * like or let a reviewer edit one. They are stated as offsets from real
 * stations rather than as bare coordinates so that relationship is readable.
 */
const SEED_DOCUMENT: SceneDocument = ((): SceneDocument => {
  const points = CUC_1_NORTH_ROAD_GRAPH.points.map((point) => ({
    id: point.id,
    x: point.x,
    y: point.y,
    yaw: point.yaw,
    type: point.type as RoadPointType,
    ...(point.defineType === undefined ? {} : { defineType: point.defineType }),
  }));
  const edges = CUC_1_NORTH_ROAD_GRAPH.edges.map((edge) => ({
    id: edge.id,
    src: edge.src,
    dst: edge.dst,
    // The fixture parsed the vendor's numerals into booleans; the document
    // model keeps the numerals, which is what the wire carries.
    oneWay: (edge.oneWay ? "1" : "0") as OneWay,
    single: (edge.single ? "1" : "0") as Single,
  }));
  const at = (id: string, dx: number, dy: number): { x: number; y: number } => {
    const anchor = points.find((point) => point.id === id);
    if (anchor === undefined) {
      throw new Error(
        `MapCanvasEditorSurface: the seed scene is anchored to vertex ${id}, which the ` +
          "cuc_1_north export does not contain. The illustrative geometry cannot be placed " +
          "against a station that is not there.",
      );
    }
    return { x: anchor.x + dx, y: anchor.y + dy };
  };
  return {
    points,
    edges,
    keepOuts: [
      // A virtual wall across the open floor beside `home`: two points, which
      // is the whole of what makes it a wall.
      { id: newKey("keepout", 0), points: [at("0000", -1.5, 1.6), at("0000", 1.5, 1.6)] },
      // A forbidden polygon beside the small entrance pair.
      {
        id: newKey("keepout", 1),
        points: [
          at("0008", 1.1, 0.9),
          at("0008", 2.9, 0.9),
          at("0008", 2.9, 2.7),
          at("0008", 1.1, 2.7),
        ],
      },
    ],
    spliceAreas: [
      // The lift car itself, at the `elevator` station.
      {
        id: newKey("splice", 2),
        type: "4",
        points: [
          at("0004", -1.0, -1.0),
          at("0004", 1.0, -1.0),
          at("0004", 1.0, 1.0),
          at("0004", -1.0, 1.0),
        ],
      },
      // A deceleration band on the approach to `wc`.
      {
        id: newKey("splice", 3),
        type: "5",
        points: [at("0005", -1.4, 1.2), at("0005", 1.4, 1.2), at("0005", 1.4, 2.4)],
      },
    ],
    sequence: 4,
  };
})();

// ---------------------------------------------------------------------------
// The scene the grammar hit-tests, and the ids that route an intent back
// ---------------------------------------------------------------------------

/**
 * What {@link MapCanvasEditorSurface}'s one seam answers.
 *
 * Two separate facts: whether the timeline moved, and what the edit made. A
 * successful move or removal creates nothing, so the two cannot be folded into
 * one nullable answer without making a refused delete indistinguishable from
 * an accepted one.
 */
type ApplyResult = {
  readonly committed: boolean;
  readonly created: string | null;
};

/**
 * Every selection target named in the document's own words, or null when ONE
 * of them cannot be.
 *
 * Null and not "the ones that could be": a removal that took four targets and
 * silently left the fifth is the quiet degradation this workspace refuses, and
 * the caller states the reason instead.
 */
function refsFor(
  document: SceneDocument,
  targets: readonly EditTarget[],
): readonly SceneRef[] | null {
  const refs = targets.flatMap((target) => {
    const ref = refForTarget(document, target);
    return ref === null ? [] : [ref];
  });
  return refs.length === targets.length ? refs : null;
}

/** One keep-out entry or typed zone, as this file draws and hit-tests it. */
type RingEntity = {
  readonly id: string;
  readonly kind: "keep-out" | "splice";
  readonly points: readonly Vertex[];
  /** The name the twin, the inspector and the map label all use. */
  readonly label: string;
  /** A zone's type numeral; absent on a keep-out entry, which has no type. */
  readonly type?: string;
};

/** Every ring entity in one list, in the order they are drawn. */
function ringEntitiesOf(document: SceneDocument): readonly RingEntity[] {
  return [
    ...document.keepOuts.map((area, index) => ({
      id: area.id,
      kind: "keep-out" as const,
      points: area.points,
      label: keepOutLabel(area, index),
    })),
    ...document.spliceAreas.map((area, index) => ({
      id: area.id,
      kind: "splice" as const,
      points: area.points,
      label: spliceAreaLabel(area, index),
      type: area.type,
    })),
  ];
}

/**
 * The words drawn at one ring entity's centre.
 *
 * Deliberately not `entity.label`: the twin's name carries an ordinal and a
 * corner count so a LIST of them is unambiguous, while the map says the one
 * thing the drawn shape cannot — which kind of region this is.
 *
 * @param entity The keep-out entry or typed zone.
 * @returns The label as drawn on the map.
 */
function areaLabelTextOf(entity: RingEntity): string {
  return entity.kind === "keep-out"
    ? keepOutKindOf(entity.points) === "wall"
      ? "keep-out wall"
      : "keep-out"
    : spliceAreaTypeLabel(entity.type ?? "");
}

/** The scene target one document element is selected as. */
function targetForRing(entity: RingEntity): EditTarget {
  return entity.points.length <= 2
    ? { kind: "path", id: ringPathId(entity.id) }
    : { kind: "area", id: entity.id };
}

/**
 * What one selection target names in the document, or null when it names
 * nothing this editor can act on.
 */
function refForTarget(document: SceneDocument, target: EditTarget): SceneRef | null {
  if (target.kind === "handle") {
    const ring = parseRingHandleId(target.id);
    if (ring !== null) {
      return { kind: "ring-vertex", entityId: ring.entityId, index: ring.index };
    }
    return pointById(document, target.id) === undefined ? null : { kind: "point", id: target.id };
  }
  if (target.kind === "vertex") {
    return { kind: "ring-vertex", entityId: target.areaId, index: target.index };
  }
  if (target.kind === "area") {
    return entityRefFor(document, target.id);
  }
  const proxy = parseRingPathId(target.id);
  if (proxy !== null) {
    // A wall's LINE is the wall: there is nothing else of it to remove.
    return entityRefFor(document, proxy);
  }
  return edgeById(document, target.id) === undefined ? null : { kind: "edge", id: target.id };
}

/** Which list a ring entity's id belongs to, asked of the document itself. */
function entityRefFor(document: SceneDocument, id: string): SceneRef | null {
  if (keepOutById(document, id) !== undefined) {
    return { kind: "keep-out", id };
  }
  if (spliceAreaById(document, id) !== undefined) {
    return { kind: "splice", id };
  }
  return null;
}

/** The world position a contextual control is anchored to, or null. */
function anchorOf(document: SceneDocument, target: EditTarget): Vertex | null {
  if (target.kind === "handle") {
    const ring = parseRingHandleId(target.id);
    if (ring !== null) {
      return ringOf(document, ring.entityId)?.points[ring.index] ?? null;
    }
    return pointById(document, target.id) ?? null;
  }
  if (target.kind === "vertex") {
    return ringOf(document, target.areaId)?.points[target.index] ?? null;
  }
  if (target.kind === "area") {
    return runCentre(ringOf(document, target.id)?.points ?? []);
  }
  const proxy = parseRingPathId(target.id);
  if (proxy !== null) {
    return runCentre(ringOf(document, proxy)?.points ?? []);
  }
  return edgeMidpoint(document, target.id);
}

/** The name the inspector, the readout and the bar all give one target. */
function nameOf(document: SceneDocument, target: EditTarget): string {
  if (target.kind === "handle") {
    const ring = parseRingHandleId(target.id);
    if (ring !== null) {
      return `corner ${String(ring.index + 1)}`;
    }
    const point = pointById(document, target.id);
    return point === undefined ? target.id : pointLabel(point);
  }
  if (target.kind === "vertex") {
    return `corner ${String(target.index + 1)}`;
  }
  const entities = ringEntitiesOf(document);
  if (target.kind === "area") {
    return entities.find((entity) => entity.id === target.id)?.label ?? target.id;
  }
  const proxy = parseRingPathId(target.id);
  if (proxy !== null) {
    return entities.find((entity) => entity.id === proxy)?.label ?? proxy;
  }
  const edge = edgeById(document, target.id);
  return edge === undefined ? target.id : `line ${edgeLabel(document, edge)}`;
}

// ---------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------

/**
 * A rectangle in SCREEN pixels: what a label occupies of the operator's view.
 *
 * "Screen" here means "screen pixels, with the pan left out" — the pan
 * translates every drawn object by the same vector, so it cannot change
 * whether two of them overlap, and leaving it out is what keeps the surviving
 * set of labels from reshuffling while an operator drags the picture around.
 */
type LabelBox = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

/** Whether two screen boxes share any area at all. */
function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * The two kinds of name this surface draws.
 *
 * They are ONE label set and not two. Two independent passes each keep their
 * own boxes and so cannot see each other's, which is exactly how "keep-out
 * wall" came to print through the station "home": the area names were drawn
 * unconditionally beside a suppression pass that only knew about stations.
 * Every drawn name below goes through the same pass, against the same
 * {@link LabelBox} list.
 */
type LabelKind = "station" | "area";

/** The screen size each kind is drawn at. */
const LABEL_FONT_SIZE_PX: Readonly<Record<LabelKind, number>> = {
  station: LABEL_SIZE_PX,
  area: AREA_LABEL_SIZE_PX,
};

/**
 * How each kind is anchored to its own text.
 *
 * The ruler measures every word with the anchor its kind is DRAWN with, so a
 * measured extent's `dx` is already the offset from the anchor to the left
 * edge — a middle-anchored word answers a negative half-width — and the box
 * arithmetic needs no per-kind special case to be true of both.
 */
const LABEL_TEXT_ANCHOR: Readonly<Record<LabelKind, "start" | "middle">> = {
  station: "start",
  area: "middle",
};

/**
 * Where each kind's anchor sits relative to the world point it names, in
 * screen pixels.
 *
 * A station's name sits BESIDE its disc, clear of it ({@link
 * LABEL_ANCHOR_CLEAR_PX}). An area's name sits ON the centre of the region it
 * names, which is the one part of that region the region itself draws nothing
 * at.
 */
const LABEL_ANCHOR_OFFSET_PX: Readonly<
  Record<LabelKind, { readonly x: number; readonly y: number }>
> = {
  station: { x: LABEL_OFFSET_X_PX, y: -LABEL_OFFSET_Y_PX },
  area: { x: 0, y: 0 },
};

/**
 * The key one measured word is held under.
 *
 * Keyed by KIND as well as by text, because the kinds are drawn at different
 * sizes and with different anchors: the same characters occupy two different
 * boxes, and one shared entry would place one kind against the other kind's
 * measurement.
 *
 * @param kind Which kind of label the word is drawn as.
 * @param text The word.
 * @returns The key.
 */
function measureKeyFor(kind: LabelKind, text: string): string {
  return `${kind}\u0000${text}`;
}

/**
 * One label's measured extent, relative to its own text anchor, in screen
 * pixels at its own kind's font size and text anchor.
 *
 * Measured rather than estimated from a character count: the suppression
 * below is only as good as the box it compares, and a box narrower than the
 * word inside it would let exactly the collision this exists to prevent
 * through.
 */
type LabelExtent = {
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
};

/** One drawn name, and everything the one placement pass decides it by. */
type LabelCandidate = {
  readonly kind: LabelKind;
  /** The drawn object's identity: a vertex id, or a ring entity's id. */
  readonly id: string;
  /** The word actually drawn, which is also the word measured. */
  readonly text: string;
  /** The world point the label is anchored to. */
  readonly at: Vertex;
  /** Whether the selection names this one — which is never dropped. */
  readonly selected: boolean;
};

/** One word the hidden ruler measures, at the size and anchor it is drawn with. */
type LabelRulerEntry = {
  readonly key: string;
  readonly kind: LabelKind;
  readonly text: string;
};

// ---------------------------------------------------------------------------
// Chrome styles
// ---------------------------------------------------------------------------

const hint: CSSProperties = {
  margin: 0,
  color: "var(--ds-text-muted)",
  fontSize: "var(--ds-font-size-label)",
  lineHeight: "var(--ds-line-height-text)",
};

const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "grid",
  gap: "var(--ds-space-2xs)",
  maxHeight: "220px",
  overflowY: "auto",
};

const rowStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  font: "inherit",
  fontSize: "var(--ds-font-size-label)",
  padding: "var(--ds-space-2xs) var(--ds-space-xs)",
  borderRadius: "var(--ds-radius-control)",
  // Stated as three long-hand properties and not as `border`, because the
  // selected variant below overrides `borderColor` alone: React warns (in the
  // console, which every e2e in this suite asserts is empty) when a re-render
  // removes a long-hand property while its shorthand is still set, and a row
  // going from selected back to unselected does exactly that.
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "transparent",
  background: "transparent",
  color: "var(--ds-text-secondary)",
  cursor: "pointer",
};

const selectedRowStyle: CSSProperties = {
  ...rowStyle,
  background: "var(--ds-surface-active)",
  borderColor: "var(--ds-border)",
  color: "var(--ds-text)",
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  fontSize: "var(--ds-font-size-label)",
  color: "var(--ds-text)",
  padding: "var(--ds-space-2xs) 0",
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "var(--ds-space-xs)",
  padding: "var(--ds-space-sm)",
  border: "1px solid var(--ds-border)",
  borderRadius: "var(--ds-radius-control)",
  background: "var(--ds-surface-inset)",
};

// ---------------------------------------------------------------------------
// The readout a host publishes
// ---------------------------------------------------------------------------

/**
 * The live state of the editor, for a host that must publish what a picture
 * cannot say.
 *
 * The document here is the COMMITTED one (what undo would step back through),
 * not the one drawn mid-drag: a readout of a gesture in flight would be a
 * readout nobody could assert against twice.
 */
export type MapCanvasEditorReadout = {
  /** The committed document's vertices. */
  readonly points: readonly RoadPoint[];
  /** The committed document's lines. */
  readonly edges: readonly RoadEdge[];
  /** The committed document's keep-out entries: walls and polygons alike. */
  readonly keepOuts: readonly { readonly id: string; readonly points: readonly Vertex[] }[];
  /** The committed document's typed zones. */
  readonly spliceAreas: readonly {
    readonly id: string;
    readonly type: string;
    readonly points: readonly Vertex[];
  }[];
  /** What is selected, after pruning against the live scene. */
  readonly selection: EditSelection;
  /** The primary target's name, in the words the twin's list uses. */
  readonly selectionSummary: string;
  /** How far in the operator has zoomed, and where they pushed the picture. */
  readonly viewport: MapViewport;
  /** Raster units per screen pixel: the counter-scale every affordance uses. */
  readonly scale: number;
  /** How many steps undo can take back. */
  readonly undoDepth: number;
  /** How many steps redo can take forward. */
  readonly redoDepth: number;
  /** What the pointer is over, in the grammar's vocabulary. */
  readonly affordance: string;
  /** The cursor the grammar asked for. */
  readonly cursor: string;
  /** Candidates inside a marquee in flight, or null when there is none. */
  readonly marqueeCandidates: number | null;
  /** Whether the magnet is on. */
  readonly magnet: boolean;
  /** The snap that caught the live position, or null. */
  readonly snap: string | null;
  /** The last refusal, or null. */
  readonly notice: string | null;
  /** Which mode is armed: `direct`, `append` or `draw-area`. */
  readonly mode: EditMode;
  /** How many points the run in progress holds; 0 when there is none. */
  readonly runLength: number;
};

export type MapCanvasEditorSurfaceProps = {
  /**
   * The canvas box's height. The box is a VIEWPORT — it clips — so this is a
   * host's decision about how much map an operator sees, not a property of
   * the picture.
   */
  readonly canvasHeightPx?: number;
  /**
   * Where the native twin sits. `"aside"` is the review layout (a wide
   * Storybook canvas has room for a column); `"below"` is for a narrow host
   * such as the demo harness's half-width column.
   */
  readonly twin?: "aside" | "below";
  /**
   * Publish the live state. A host that has to assert on this editor from
   * outside — the e2e demo — renders its readouts here; the Storybook host
   * passes nothing and gets the editor bare.
   */
  readonly instrument?: (readout: MapCanvasEditorReadout) => ReactNode;
};

/** The whole editor: canvas, overlay, contextual chrome, and the native twin. */
export function MapCanvasEditorSurface({
  canvasHeightPx = 520,
  twin = "aside",
  instrument,
}: MapCanvasEditorSurfaceProps = {}) {
  const [session, setSession] = useState<EditSession<SceneDocument>>(() =>
    beginSession(SEED_DOCUMENT),
  );
  const [rawSelection, setSelection] = useState<EditSelection>(EMPTY_SELECTION);
  const [viewport, setViewport] = useState<MapViewport>({ zoom: 1, panX: 0, panY: 0 });
  const [fitNonce, setFitNonce] = useState(0);
  const [magnet, setMagnet] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>("direct");
  const [newPointType, setNewPointType] = useState<RoadPointType>(STATION_TYPE);
  const [drawKind, setDrawKind] = useState<"keep-out" | "splice">("keep-out");
  const [zoneType, setZoneType] = useState<string>("3");
  const [drawing, setDrawing] = useState<readonly Vertex[] | null>(null);
  const [runAnchor, setRunAnchor] = useState<string | null>(null);

  const document = session.current;
  const projector = useMapCanvasProjector(FRAME);

  // The canvas holds the image at its own pixel width, so this is exact from
  // the first frame and can never be the kernel's "not laid out yet" null.
  // Refused rather than defaulted, per the workspace's fail-first rule.
  const metresPerPixel = metresPerScreenPixel(FRAME, FRAME.pixelWidth, viewport.zoom);
  if (metresPerPixel === null) {
    throw new Error("MapCanvasEditor: the canvas reported no drawn scale for a live viewport.");
  }

  // Every tolerance is a SCREEN pixel count converted at the current zoom, so
  // picking stays as tight at 8x as it is fitted.
  const tolerance = useMemo<EditTolerances>(
    () => ({
      handleM: metresPerPixel * HANDLE_PICK_RADIUS_PX,
      ghostM: metresPerPixel * GHOST_PICK_RADIUS_PX,
      knobM: metresPerPixel * KNOB_PICK_RADIUS_PX,
      badgeM: metresPerPixel * BADGE_PICK_RADIUS_PX,
      headingArmM: metresPerPixel * HEADING_ARM_PX,
      revealM: metresPerPixel * REVEAL_RADIUS_PX,
      snapM: metresPerPixel * SNAP_RADIUS_PX,
    }),
    [metresPerPixel],
  );

  const entities = useMemo(() => ringEntitiesOf(document), [document]);
  const walls = useMemo(() => entities.filter((entity) => entity.points.length <= 2), [entities]);
  const polygons = useMemo(() => entities.filter((entity) => entity.points.length > 2), [entities]);

  const scene = useMemo<EditScene>(
    () => ({
      // Only a STATION carries a yaw, and only a handle with a yaw gets a
      // heading knob — so "a path point has no facing" is stated once, here,
      // instead of being special-cased wherever the knob is drawn or picked.
      handles: [
        ...document.points.map((point) =>
          point.type === STATION_TYPE
            ? { id: point.id, x: point.x, y: point.y, yaw: point.yaw }
            : { id: point.id, x: point.x, y: point.y },
        ),
        // A two-point entry's ends, so its segment has handles to be a path of.
        ...walls.flatMap((entity) =>
          entity.points.map((corner, index) => ({
            id: ringHandleId(entity.id, index),
            x: corner.x,
            y: corner.y,
          })),
        ),
      ],
      // One path per EDGE, two handles each (see the file header), plus one per
      // two-point keep-out entry, which is a line and nothing else.
      paths: [
        ...document.edges.map((edge) => ({ id: edge.id, handleIds: [edge.src, edge.dst] })),
        ...walls.map((entity) => ({
          id: ringPathId(entity.id),
          handleIds: entity.points.map((_corner, index) => ringHandleId(entity.id, index)),
        })),
      ],
      areas: polygons.map((entity) => ({ id: entity.id, ring: entity.points })),
    }),
    [document, polygons, walls],
  );

  // Undo, redo and a delete can all take a target out from under the
  // selection. Pruning against the live scene is the grammar's own answer to
  // that (invariant G4) and is why nothing downstream has to re-check whether
  // what it holds still exists.
  const selection = useMemo(() => pruneSelection(rawSelection, scene), [rawSelection, scene]);

  /**
   * Apply one edit, or say why it did not happen.
   *
   * The single seam between the gestures above and the document model below:
   * an accepted edit becomes one timeline step, and a refusal becomes the
   * notice the twin shows and the readout publishes. There is no third
   * outcome — in particular there is no "apply what worked", which is how an
   * editor ends up in a state its operator did not ask for.
   *
   * `committed` and `created` are separate answers because an operation can
   * succeed and create nothing (a move, a removal): reading "created is null"
   * as "it was refused" is exactly the conflation that would make a refused
   * delete look like a successful one.
   */
  const apply = useCallback((edit: SceneEdit): ApplyResult => {
    if (!edit.ok) {
      setNotice(`Refused: ${edit.reason}`);
      return { committed: false, created: null };
    }
    setNotice(null);
    setSession((current) => commitEdit(current, edit.document));
    return { committed: true, created: edit.created };
  }, []);

  /** Commit a document this file assembled from more than one model call. */
  const commitDocument = useCallback((next: SceneDocument) => {
    setNotice(null);
    setSession((current) => commitEdit(current, next));
  }, []);

  const dropFromSelection = useCallback((gone: readonly EditTarget[]) => {
    setSelection((current) => {
      const primary = current.primary;
      return {
        targets: current.targets.filter(
          (target) => !gone.some((removed) => sameTarget(removed, target)),
        ),
        primary:
          primary !== null && gone.some((removed) => sameTarget(removed, primary))
            ? null
            : primary,
      };
    });
  }, []);

  const selectOnly = useCallback((target: EditTarget) => {
    setSelection((current) => selectTargets(current, [target], false));
  }, []);

  const endRun = useCallback(() => {
    setRunAnchor(null);
    setDrawing(null);
  }, []);

  /** Leave the armed mode entirely, abandoning any run with it. */
  const disarm = useCallback(() => {
    setMode("direct");
    endRun();
  }, [endRun]);

  /**
   * Commit the run a `draw-area` gesture has drawn.
   *
   * Two corners are a virtual wall and three or more a forbidden polygon —
   * the point count IS the decision, so both endings arrive here and the
   * document model refuses only what neither can be.
   */
  const commitRun = useCallback(
    (run: readonly Vertex[]) => {
      const edit =
        drawKind === "keep-out"
          ? addKeepOut(document, run)
          : addSpliceArea(document, zoneType, run);
      const outcome = apply(edit);
      if (!outcome.committed || !edit.ok) {
        // Refused: the run stays in progress so the operator can add the
        // corner it was short of, rather than losing what they drew.
        return;
      }
      endRun();
      const entity = ringEntitiesOf(edit.document).find(
        (candidate) => candidate.id === outcome.created,
      );
      if (entity !== undefined) {
        selectOnly(targetForRing(entity));
      }
    },
    [apply, document, drawKind, endRun, selectOnly, zoneType],
  );

  /**
   * Place one point of an `append` run.
   *
   * A placement that lands ON an existing vertex means that vertex — the
   * magnet resolves a click near one to its exact position, and
   * `pointAt` reads that coincidence — so the same pen both PLACES vertices
   * and JOINS existing ones, which is how a corridor is drawn between two
   * stations that are already there. Each placement is its own timeline step:
   * one click, one undo.
   */
  const placeOnRun = useCallback(
    (at: Vertex) => {
      const existing = pointAt(document, at);
      if (existing !== null) {
        if (runAnchor === null) {
          // Nothing to join yet: this click only says where the run starts.
          setRunAnchor(existing.id);
          setDrawing([{ x: existing.x, y: existing.y }]);
          setNotice(null);
          return;
        }
        // A duplicate or a self-join refuses, and then nothing is placed,
        // nothing is joined, and the anchor stays where it was.
        if (!apply(addEdge(document, runAnchor, existing.id)).committed) {
          return;
        }
        setRunAnchor(existing.id);
        setDrawing([{ x: existing.x, y: existing.y }]);
        return;
      }
      // The vertex and the line it arrives on are ONE click, so they are one
      // timeline step: the document is assembled here and committed once,
      // rather than committed twice and undone twice.
      const placed = addPoint(document, at, newPointType);
      if (!placed.ok) {
        setNotice(`Refused: ${placed.reason}`);
        return;
      }
      const createdId = placed.created;
      if (createdId === null) {
        setNotice("Refused: a placement produced no vertex, so there is nothing to join.");
        return;
      }
      if (runAnchor === null) {
        commitDocument(placed.document);
      } else {
        const joined = addEdge(placed.document, runAnchor, createdId);
        if (!joined.ok) {
          // Unreachable while the model's two edge refusals are the only ones
          // (a vertex placed a moment ago can be neither a duplicate end nor
          // its own other end) — and if that ever changes, the operator is
          // told rather than given half a gesture.
          setNotice(`Refused: ${joined.reason}`);
          return;
        }
        commitDocument(joined.document);
      }
      setRunAnchor(createdId);
      setDrawing([{ x: at.x, y: at.y }]);
    },
    [apply, commitDocument, document, newPointType, runAnchor],
  );

  const handleIntent = useCallback(
    (intent: EditIntent) => {
      switch (intent.kind) {
        case "select-set": {
          setNotice(null);
          setSelection((current) => selectTargets(current, intent.targets, intent.additive));
          return;
        }
        case "deselect":
          setNotice(null);
          setSelection(EMPTY_SELECTION);
          return;
        case "move-set": {
          const moves = intent.moves.flatMap((move): readonly SceneMove[] => {
            if (move.target.kind === "handle") {
              const ring = parseRingHandleId(move.target.id);
              return ring === null
                ? [{ kind: "point", id: move.target.id, at: move.at }]
                : [
                    {
                      kind: "ring-vertex",
                      entityId: ring.entityId,
                      index: ring.index,
                      at: move.at,
                    },
                  ];
            }
            if (move.target.kind === "vertex") {
              return [
                {
                  kind: "ring-vertex",
                  entityId: move.target.areaId,
                  index: move.target.index,
                  at: move.at,
                },
              ];
            }
            return [];
          });
          apply(moveMany(document, moves));
          return;
        }
        case "rotate":
          apply(setPointYaw(document, intent.id, intent.yaw));
          return;
        case "insert": {
          const proxy = parseRingPathId(intent.pathId);
          if (proxy !== null) {
            // A corner on a wall's only side: the entry becomes a polygon,
            // which is what the firmware's point count already says it is.
            if (
              !apply(insertRingVertex(document, proxy, intent.afterIndex, intent.at)).committed
            ) {
              return;
            }
            selectOnly({ kind: "area", id: proxy });
            return;
          }
          if (intent.afterIndex !== 0) {
            // Every road path here is one edge, so there is exactly one
            // segment to insert into. Anything else means the scene stopped
            // matching the graph, and saying so beats inserting somewhere
            // plausible.
            setNotice(
              `Refused: an insertion arrived for segment ${String(intent.afterIndex)} of a line that has only one.`,
            );
            return;
          }
          const split = apply(splitEdge(document, intent.pathId, intent.at));
          if (split.created !== null) {
            selectOnly({ kind: "handle", id: split.created });
          }
          return;
        }
        case "insert-vertex":
          apply(insertRingVertex(document, intent.areaId, intent.edgeIndex, intent.at));
          return;
        case "delete-set": {
          const refs = refsFor(document, intent.targets);
          if (refs === null) {
            setNotice(
              "Refused: the selection holds something this document cannot name, so a removal " +
                "would have taken the rest and left it. Re-select and try again.",
            );
            return;
          }
          if (apply(removeMany(document, refs)).committed) {
            dropFromSelection(intent.targets);
          }
          return;
        }
        case "place":
          placeOnRun(intent.at);
          return;
        case "draw": {
          const run = drawing ?? [];
          const last = run[run.length - 1];
          if (last !== undefined && last.x === intent.at.x && last.y === intent.at.y) {
            // A corner on top of the previous corner is the second half of a
            // double click, not an intention.
            return;
          }
          setNotice(null);
          setDrawing([...run, intent.at]);
          return;
        }
        case "close-ring": {
          const run = drawing ?? [];
          commitRun(run);
          return;
        }
        case "finish-run": {
          const run = drawing ?? [];
          if (mode === "draw-area") {
            if (run.length === 0) {
              // Nothing has been drawn, so there is nothing to finish and the
              // control means the only other thing it can: leave the mode.
              disarm();
              return;
            }
            commitRun(run);
            return;
          }
          // In `append` the points are already committed, one step each, so
          // finishing only ends the chain: the mode stays armed for the next
          // one, and Escape (the ladder's next rung) is what leaves it.
          endRun();
          return;
        }
        case "cancel-run":
          // The run is abandoned, the mode is NOT: Escape peels one layer.
          // What `append` already placed stays placed — each placement was its
          // own timeline step, so Undo is what takes them back.
          endRun();
          return;
        case "resume-drawing": {
          if (parseRingPathId(intent.pathId) !== null) {
            setNotice(
              "Refused: a keep-out wall is not a route, so a run cannot be continued from its end. " +
                "Draw a new keep-out, or add a corner to this one.",
            );
            return;
          }
          const edge = edgeById(document, intent.pathId);
          if (edge === undefined) {
            setNotice(`Refused: line ${intent.pathId} is not in this scene.`);
            return;
          }
          const endpointId = intent.endpoint === "head" ? edge.src : edge.dst;
          const point = pointById(document, endpointId);
          if (point === undefined) {
            setNotice(`Refused: vertex ${endpointId} is not in this scene.`);
            return;
          }
          setNotice(null);
          setRunAnchor(point.id);
          setDrawing([{ x: point.x, y: point.y }]);
          return;
        }
        case "refused":
          setNotice(`Refused: ${intent.reason}`);
          return;
        case "nothing":
          return;
      }
    },
    [
      apply,
      commitRun,
      disarm,
      document,
      drawing,
      dropFromSelection,
      endRun,
      mode,
      placeOnRun,
      selectOnly,
    ],
  );

  const capabilities = useMemo(
    () => ({
      // Declared supported because this document HAS somewhere for keep-out
      // geometry to go — which is the whole of what the capability asks.
      areas: { supported: true as const },
      // A road graph's lines are objects, not the segments of an ordered
      // route: a click on one selects it.
      edges: { supported: true as const },
    }),
    [],
  );

  const surface = useDirectEditSurface({
    mode,
    // The pen rhythm: an armed mode survives its own placement, so a corridor
    // or a ring is one engagement rather than one click each.
    arming: "sustained",
    scene,
    selection,
    capabilities,
    tolerance,
    drawing: drawing !== null && drawing.length > 0 ? drawing : null,
    snapping: { enabled: magnet, toGeometry: true, toGrid: false },
    grid: null,
    toWorld: projector.toWorld,
    onIntent: handleIntent,
    onRefused: (reason) => {
      setNotice(`Refused: ${reason}`);
    },
  });

  /**
   * Would a primary press here take hold of nothing?
   *
   * Answered by the GRAMMAR rather than by a rule of this file's own, so the
   * canvas pans in exactly the cases the editor is not already using: a press
   * on a handle, a line, or an insertion marker grips, Shift on empty floor
   * grips too (it is the marquee), and in an armed mode nothing grips at all
   * (invariant D), which is what lets a drag pan while a click draws.
   */
  const isBackgroundPress = useCallback(
    (clientX: number, clientY: number, modifiers: { readonly shift: boolean }): boolean => {
      const at = projector.toWorld(clientX, clientY);
      if (at === null) {
        return true;
      }
      const probe: EditProbe = {
        mode,
        modality: surface.modality,
        scene,
        selection,
        at,
        tolerance,
        capabilities,
        drawing: drawing !== null && drawing.length > 0 ? drawing : null,
        modifiers: { shift: modifiers.shift, alt: false },
        snapping: { enabled: magnet, toGeometry: true, toGrid: false },
        grid: null,
      };
      return resolveGrip(probe) === null;
    },
    [
      capabilities,
      drawing,
      magnet,
      mode,
      projector,
      scene,
      selection,
      surface.modality,
      tolerance,
    ],
  );

  const deleteSelection = useCallback(() => {
    const refs = refsFor(document, selection.targets);
    if (refs === null) {
      setNotice(
        "Refused: the selection holds something this document cannot name, so a removal would " +
          "have taken the rest and left it. Re-select and try again.",
      );
      return;
    }
    if (!apply(removeMany(document, refs)).committed) {
      return;
    }
    dropFromSelection(selection.targets);
  }, [apply, document, dropFromSelection, selection.targets]);

  useEditCommandKeys({
    enabled: true,
    armed: mode !== "direct",
    runLength: drawing?.length ?? 0,
    hasSelection: selection.targets.length > 0,
    onFinishRun: () => {
      handleIntent({ kind: "finish-run" });
    },
    onCancelRun: () => {
      handleIntent({ kind: "cancel-run" });
    },
    onDisarm: disarm,
    onDeselectAll: () => {
      setSelection(EMPTY_SELECTION);
    },
    onDeleteSelection: deleteSelection,
  });

  // ---- what is DRAWN: the document with the live gesture applied ---------
  const drag = surface.drag;
  const drawn = useMemo<SceneDocument>(() => {
    if (drag === null) {
      return document;
    }
    if (drag.kind === "move-set") {
      const moves = drag.moves.flatMap((move): readonly SceneMove[] => {
        if (move.target.kind === "handle") {
          const ring = parseRingHandleId(move.target.id);
          return ring === null
            ? [{ kind: "point", id: move.target.id, at: move.at }]
            : [{ kind: "ring-vertex", entityId: ring.entityId, index: ring.index, at: move.at }];
        }
        if (move.target.kind === "vertex") {
          return [
            {
              kind: "ring-vertex",
              entityId: move.target.areaId,
              index: move.target.index,
              at: move.at,
            },
          ];
        }
        return [];
      });
      const preview = moveMany(document, moves);
      // A preview the model declines is a preview of nothing happening, which
      // is the truth: the release will state the reason through `apply`.
      return preview.ok ? preview.document : document;
    }
    if (drag.kind === "rotate") {
      const preview = setPointYaw(document, drag.id, drag.yaw);
      return preview.ok ? preview.document : document;
    }
    return document;
  }, [document, drag]);

  const drawnEntities = useMemo(() => ringEntitiesOf(drawn), [drawn]);
  const affordance = surface.affordance;
  const selectedPointIds = useMemo(
    () =>
      new Set(
        selection.targets.flatMap((target) => (target.kind === "handle" ? [target.id] : [])),
      ),
    [selection],
  );
  const selectedPathIds = useMemo(
    () =>
      new Set(selection.targets.flatMap((target) => (target.kind === "path" ? [target.id] : []))),
    [selection],
  );
  const selectedAreaIds = useMemo(
    () =>
      new Set(selection.targets.flatMap((target) => (target.kind === "area" ? [target.id] : []))),
    [selection],
  );
  const armedAreaIds = useMemo(() => {
    const armed = new Set(selectedAreaIds);
    for (const target of selection.targets) {
      if (target.kind === "vertex") {
        armed.add(target.areaId);
      }
    }
    return armed;
  }, [selectedAreaIds, selection.targets]);

  // ---- labels: stations AND areas, in one priority order -----------------
  // Thirteen stations carry a name, and at the zoom the map opens at their
  // names are longer than the distance between them: `entrancein` and
  // `entranceout` print on top of each other as "entranceinceout", which
  // names nothing. This is the map-renderer's answer rather than a smaller
  // font — a label that will not fit is NOT DRAWN, and zooming in, which is
  // what an operator does when they want to read a crowded area, separates
  // the stations and lets more of them appear.
  //
  // The AREA names are in this same list, and this is the whole reason the
  // list is a list of `LabelCandidate` and not of stations: an area name
  // drawn outside the pass cannot be seen by it, so "keep-out wall" printed
  // through "home", "Deceleration" through "wc" and "Lift / elevator"
  // through "elevator" at fit zoom. One pass, one set of placed boxes.
  //
  // The order below is the whole of the "which one survives" decision:
  //
  //  1. the SELECTED entity of EITHER kind, drawn whatever it collides with —
  //     the operator asked for that one by name;
  //  2. every other named station, in ascending vertex id;
  //  3. every area, in ascending entity id.
  //
  // Stations before areas because a station name names a DESTINATION an
  // operator sends a robot to and nothing else on the map says which one it
  // is, while an area's name is a second reading of a region whose extent is
  // already drawn as a filled polygon or a thick wall — losing the word
  // costs the kind, not the object. Ascending id and not, say, distance from
  // the centre or document order: a priority that reads a POSITION re-ranks
  // the whole set while a station is being dragged, and one that reads
  // document order re-ranks it when an insertion appends a vertex. Either
  // makes labels flicker during an unrelated gesture. An id is assigned once
  // and never moves.
  const labelCandidates = useMemo<readonly LabelCandidate[]>(() => {
    const byId = (a: LabelCandidate, b: LabelCandidate): number =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    const stations = drawn.points.flatMap((point) =>
      point.type === STATION_TYPE && point.defineType !== undefined && point.defineType !== ""
        ? [
            {
              kind: "station" as const,
              id: point.id,
              text: point.defineType,
              at: { x: point.x, y: point.y },
              selected: selectedPointIds.has(point.id),
            },
          ]
        : [],
    );
    // An entity with no centre has no anchor to sit a name on, and says so by
    // having no candidate at all rather than by being placed at a made-up
    // point.
    const areas = drawnEntities.flatMap((entity) => {
      const centre = runCentre(entity.points);
      return centre === null
        ? []
        : [
            {
              kind: "area" as const,
              id: entity.id,
              text: areaLabelTextOf(entity),
              at: centre,
              // "Selected" asked of every way this editor selects a region:
              // a polygon is an `area` target, a two-point wall is selected
              // through its line (`path`), and a corner selection arms the
              // region it belongs to.
              selected:
                armedAreaIds.has(entity.id) || selectedPathIds.has(ringPathId(entity.id)),
            },
          ];
    });
    stations.sort(byId);
    areas.sort(byId);
    const ranked = [...stations, ...areas];
    return [
      ...ranked.filter((candidate) => candidate.selected),
      ...ranked.filter((candidate) => !candidate.selected),
    ];
  }, [drawn, drawnEntities, selectedPointIds, selectedPathIds, armedAreaIds]);

  // Every distinct word that has to be measured — one entry per (kind, word),
  // because the two kinds are drawn at different sizes and with different
  // anchors — in a stable order so the hidden measuring `<svg>` below does not
  // reorder its children on a selection change.
  const labelRulerEntries = useMemo<readonly LabelRulerEntry[]>(() => {
    const entries = new Map<string, LabelRulerEntry>();
    for (const candidate of labelCandidates) {
      const key = measureKeyFor(candidate.kind, candidate.text);
      if (!entries.has(key)) {
        entries.set(key, { key, kind: candidate.kind, text: candidate.text });
      }
    }
    return [...entries.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }, [labelCandidates]);

  // How wide each word actually is, in screen pixels, measured from the SAME
  // font the labels are drawn in. An estimate from a character count would be
  // the wrong instrument: a box narrower than the word inside it lets through
  // exactly the overprinting this is here to stop.
  const [labelExtents, setLabelExtents] = useState<ReadonlyMap<string, LabelExtent>>(
    () => new Map(),
  );
  const measureRef = useRef<SVGSVGElement | null>(null);
  useLayoutEffect(() => {
    const svg = measureRef.current;
    if (svg === null) {
      throw new Error(
        "MapCanvasEditorSurface: the label measuring <svg> is not mounted, so no station or " +
          "area label's width is known. Suppression cannot be decided without it.",
      );
    }
    const measured = new Map<string, LabelExtent>();
    for (const node of svg.querySelectorAll("text")) {
      const key = node.getAttribute("data-label-key");
      const text = node.getAttribute("data-label-measure");
      const kind = node.getAttribute("data-label-kind");
      if (key === null || text === null || kind === null) {
        throw new Error(
          "MapCanvasEditorSurface: a <text> in the label ruler carries no key, word or kind, " +
            "so which label it measures is unknown. Refusing to place labels against it.",
        );
      }
      const bbox = node.getBBox();
      if (!(bbox.width > 0) || !(bbox.height > 0)) {
        throw new Error(
          `MapCanvasEditorSurface: the ${kind} label "${text}" measured ` +
            `${String(bbox.width)} x ${String(bbox.height)} px, which is not a box a word can ` +
            "occupy. Refusing to place labels against a measurement that cannot be true.",
        );
      }
      measured.set(key, { dx: bbox.x, dy: bbox.y, width: bbox.width, height: bbox.height });
    }
    setLabelExtents((current) => {
      // Same words, same numbers: keep the identity so this effect cannot
      // become a render loop.
      if (
        current.size === measured.size &&
        [...measured].every(([text, extent]) => {
          const held = current.get(text);
          return (
            held !== undefined &&
            held.dx === extent.dx &&
            held.dy === extent.dy &&
            held.width === extent.width &&
            held.height === extent.height
          );
        })
      ) {
        return current;
      }
      return measured;
    });
  }, [labelRulerEntries]);

  const handleStateOf = (
    id: string,
  ): "idle" | "hover" | "selected" | "primary" | "dragging" => {
    if (
      drag !== null &&
      ((drag.kind === "move-set" &&
        drag.moves.some((move) => move.target.kind === "handle" && move.target.id === id)) ||
        (drag.kind === "rotate" && drag.id === id))
    ) {
      return "dragging";
    }
    const target: EditTarget = { kind: "handle", id };
    if (selection.primary !== null && sameTarget(selection.primary, target)) {
      return "primary";
    }
    if (selectedPointIds.has(id)) {
      return "selected";
    }
    if (affordance.kind === "handle" && affordance.id === id) {
      return "hover";
    }
    return "idle";
  };

  const ringVertexStateOf = (
    areaId: string,
    index: number,
  ): "idle" | "hover" | "selected" | "primary" | "dragging" => {
    if (
      drag !== null &&
      drag.kind === "move-set" &&
      drag.moves.some(
        (move) =>
          move.target.kind === "vertex" &&
          move.target.areaId === areaId &&
          move.target.index === index,
      )
    ) {
      return "dragging";
    }
    const target: EditTarget = { kind: "vertex", areaId, index };
    if (selection.primary !== null && sameTarget(selection.primary, target)) {
      return "primary";
    }
    if (
      selection.targets.some(
        (candidate) =>
          candidate.kind === "vertex" &&
          candidate.areaId === areaId &&
          candidate.index === index,
      )
    ) {
      return "selected";
    }
    if (
      affordance.kind === "vertex" &&
      affordance.areaId === areaId &&
      affordance.index === index
    ) {
      return "hover";
    }
    return "idle";
  };

  const hoveredPathId =
    affordance.kind === "path"
      ? affordance.id
      : affordance.kind === "path-edge" || affordance.kind === "ghost"
        ? affordance.pathId
        : null;
  const hoveredAreaId =
    affordance.kind === "area"
      ? affordance.id
      : affordance.kind === "ring-edge" || affordance.kind === "ghost-vertex"
        ? affordance.areaId
        : null;

  const selectionSummary = ((primary: EditTarget | null): string => {
    if (primary === null) {
      return `${String(selection.targets.length)} selected`;
    }
    return nameOf(document, primary);
  })(selection.primary);

  const selectRow = useCallback((target: EditTarget, additive: boolean) => {
    setSelection((current) => selectTargets(current, [target], additive));
  }, []);

  // A live drag's snap evidence wins over a hover's: while something is being
  // moved, the reason it is landing where it is, is the thing worth drawing.
  const resolved = surface.dragFeedback?.resolved ?? surface.pending?.resolved ?? null;
  const snap = resolved?.snap ?? null;
  const marquee = surface.marquee;
  const insertionGhost = affordance.kind === "ghost" ? affordance : null;
  const ringGhost = affordance.kind === "ghost-vertex" ? affordance : null;
  const insertPreview =
    drag !== null && (drag.kind === "insert" || drag.kind === "insert-vertex") ? drag : null;
  const revealed = surface.revealedKnob;
  const revealedPoint = revealed === null ? undefined : pointById(drawn, revealed.id);
  const pending = surface.pending;

  // ---- the contextual chrome's anchor ------------------------------------
  // The selection bar is HTML and a sibling of the canvas, so its position is
  // in the box's own CSS pixels: the pan, plus the raster column times the
  // zoom. The same two numbers `MapCanvas` writes into the stack's transform
  // and drawn size, so the bar cannot disagree with the picture about where
  // the thing it acts on is.
  const primaryAnchor = selection.primary === null ? null : anchorOf(drawn, selection.primary);
  const anchorAt =
    primaryAnchor === null
      ? null
      : (() => {
          const at = project(FRAME, primaryAnchor);
          return {
            left: viewport.panX + at.col * viewport.zoom + ACTIONS_OFFSET_PX,
            top: viewport.panY + at.row * viewport.zoom + ACTIONS_OFFSET_PX,
          };
        })();

  const runLength = drawing?.length ?? 0;
  const armedNote =
    mode === "append"
      ? runAnchor === null
        ? "Click the floor to place a vertex, or click an existing one to start a line there."
        : "Each click places a vertex and joins it to the last. With Snap on, a click on an " +
          "existing vertex joins to THAT one instead of placing a duplicate. Enter ends the " +
          "chain; Escape leaves the mode."
      : mode === "draw-area"
        ? runLength === 0
          ? `Click to drop the first corner of a ${
              drawKind === "keep-out" ? "keep-out" : spliceAreaTypeLabel(zoneType)
            }.`
          : runLength === 1
            ? "One corner. A second corner and Finish makes a virtual wall."
            : runLength === 2
              ? "Two corners: Finish makes a virtual wall, a third corner makes an area."
              : `${String(runLength)} corners: click the first corner again (or double-click) to close the area, or Finish to keep it as drawn.`
        : null;

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      {/* The label ruler. Every name — station AND area — is drawn here once
          per kind, in the same font and AT THE SIZE AND TEXT ANCHOR ITS OWN
          KIND IS DRAWN WITH on the map (a station at LABEL_SIZE_PX anchored
          `start`, an area at AREA_LABEL_SIZE_PX anchored `middle`), in an
          UNTRANSFORMED <svg> — so one user unit is one screen pixel and
          `getBBox()` answers in exactly the units, and about exactly the box,
          the suppression above compares. Measuring an area's word at the
          station size, or at the station's anchor, would compare a box the
          drawn label does not occupy. It is `visibility: hidden` and not
          `display: none` (which has no geometry to measure), takes no space,
          and is hidden from assistive technology because the names it holds
          are the same ones the twin lists below. */}
      <svg
        ref={measureRef}
        aria-hidden="true"
        width={0}
        height={0}
        style={{ position: "absolute", width: 0, height: 0, visibility: "hidden" }}
        data-testid="mc-label-ruler"
      >
        {labelRulerEntries.map((entry) => (
          <text
            key={entry.key}
            data-label-key={entry.key}
            data-label-measure={entry.text}
            data-label-kind={entry.kind}
            x={0}
            y={0}
            textAnchor={LABEL_TEXT_ANCHOR[entry.kind]}
            fontSize={LABEL_FONT_SIZE_PX[entry.kind]}
            fontFamily="var(--ds-font-sans)"
          >
            {entry.text}
          </text>
        ))}
      </svg>

      <ButtonRow>
        <Button
          size="sm"
          disabled={session.past.length === 0}
          onClick={() => {
            setSession(undoEdit);
          }}
        >
          Undo
        </Button>
        <Button
          size="sm"
          disabled={session.future.length === 0}
          onClick={() => {
            setSession(redoEdit);
          }}
        >
          Redo
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={selection.targets.length === 0}
          onClick={deleteSelection}
        >
          Delete selected
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setFitNonce((current) => current + 1);
          }}
        >
          Fit
        </Button>
        <Button
          size="sm"
          variant={magnet ? "primary" : "secondary"}
          onClick={() => {
            setMagnet((current) => !current);
          }}
        >
          {magnet ? "Snap: on" : "Snap: off"}
        </Button>
      </ButtonRow>

      {/* The modes. Which one is armed decides what a click on the floor
          MEANS, so it is chrome and not a gesture: an operator can see what
          the next click will do before they make it. */}
      <div
        role="group"
        aria-label="Editing mode"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--ds-space-xs)",
          alignItems: "center",
        }}
      >
        <Button
          size="sm"
          data-mode="direct"
          aria-pressed={mode === "direct"}
          variant={mode === "direct" ? "primary" : "secondary"}
          onClick={disarm}
        >
          Select
        </Button>
        <Button
          size="sm"
          data-mode="append"
          aria-pressed={mode === "append"}
          variant={mode === "append" ? "primary" : "secondary"}
          onClick={() => {
            setMode("append");
            endRun();
            setNotice(null);
          }}
        >
          Add points
        </Button>
        <Button
          size="sm"
          data-mode="draw-keep-out"
          aria-pressed={mode === "draw-area" && drawKind === "keep-out"}
          variant={mode === "draw-area" && drawKind === "keep-out" ? "primary" : "secondary"}
          onClick={() => {
            setMode("draw-area");
            setDrawKind("keep-out");
            endRun();
            setSelection(EMPTY_SELECTION);
            setNotice(null);
          }}
        >
          Draw keep-out
        </Button>
        <Button
          size="sm"
          data-mode="draw-zone"
          aria-pressed={mode === "draw-area" && drawKind === "splice"}
          variant={mode === "draw-area" && drawKind === "splice" ? "primary" : "secondary"}
          onClick={() => {
            setMode("draw-area");
            setDrawKind("splice");
            endRun();
            setSelection(EMPTY_SELECTION);
            setNotice(null);
          }}
        >
          Draw zone
        </Button>

        {mode === "append" ? (
          <>
            <Button
              size="sm"
              aria-pressed={newPointType === STATION_TYPE}
              variant={newPointType === STATION_TYPE ? "primary" : "secondary"}
              onClick={() => {
                setNewPointType(STATION_TYPE);
              }}
            >
              New: station
            </Button>
            <Button
              size="sm"
              aria-pressed={newPointType === PATH_POINT_TYPE}
              variant={newPointType === PATH_POINT_TYPE ? "primary" : "secondary"}
              onClick={() => {
                setNewPointType(PATH_POINT_TYPE);
              }}
            >
              New: path point
            </Button>
          </>
        ) : null}

        {mode === "draw-area" && drawKind === "splice" ? (
          <Select
            selectSize="sm"
            aria-label="Zone type to draw"
            value={zoneType}
            onChange={(event) => {
              setZoneType(event.target.value);
            }}
          >
            {SPLICE_AREA_TYPES.map((type) => (
              <option key={type} value={type}>
                {spliceAreaTypeLabel(type)}
              </option>
            ))}
          </Select>
        ) : null}

        {mode === "direct" ? null : (
          <>
            <Button
              size="sm"
              onClick={() => {
                handleIntent({ kind: "finish-run" });
              }}
            >
              Finish
            </Button>
            <Button size="sm" variant="secondary" onClick={disarm}>
              Cancel
            </Button>
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          ...(twin === "aside"
            ? { gridTemplateColumns: "minmax(0, 1fr) 300px" }
            : { gridTemplateRows: "auto auto" }),
          gap: "var(--ds-space-md)",
          alignItems: "start",
        }}
      >
        {/* The canvas box and its contextual chrome share this positioned
            wrapper. The bar is a SIBLING of the canvas, so a press on it never
            reaches the grammar's pointer props (which live on the raster) —
            see the file header on invariant A'. */}
        <div style={{ position: "relative", height: `${String(canvasHeightPx)}px` }}>
          <MapCanvas
            frame={FRAME}
            src={CUC_1_NORTH_RASTER.dataUri}
            alt="Occupancy raster for the cuc_1_north map, with its editable road graph and keep-out geometry"
            viewport={viewport}
            onViewportChange={setViewport}
            fitNonce={fitNonce}
            projector={projector}
            surfaceProps={surface.surfaceProps}
            isBackgroundPress={isBackgroundPress}
          >
            {({ project: toRaster, scale }) => {

              // Which labels are drawn at THIS zoom — station names and area
              // names in ONE pass over ONE list of placed boxes. Walked in the
              // priority order `labelCandidates` fixed, keeping each one that
              // still finds clear space and dropping the rest — the reason
              // zooming in reveals more names rather than shrinking the ones
              // already there.
              //
              // The arithmetic is in SCREEN pixels with the pan left out:
              // `col / scale` is where a raster column falls on screen up to
              // that constant translation, and every offset and extent below
              // is already a screen quantity.
              const placed: LabelBox[] = [];
              const labels = labelCandidates.flatMap((candidate) => {
                const extent = labelExtents.get(measureKeyFor(candidate.kind, candidate.text));
                if (extent === undefined) {
                  // Nothing is placed against an unmeasured word — that would
                  // be guessing at the box the whole rule turns on.
                  return [];
                }
                const offset = LABEL_ANCHOR_OFFSET_PX[candidate.kind];
                const at = toRaster(candidate.at);
                const centreX = at.col / scale;
                const centreY = at.row / scale;
                const anchorX = centreX + offset.x;
                const anchorY = centreY + offset.y;
                const box: LabelBox = {
                  left: anchorX + extent.dx - LABEL_CLEARANCE_PX,
                  top: anchorY + extent.dy - LABEL_CLEARANCE_PX,
                  right: anchorX + extent.dx + extent.width + LABEL_CLEARANCE_PX,
                  bottom: anchorY + extent.dy + extent.height + LABEL_CLEARANCE_PX,
                };
                // The selected entity's name is drawn whatever it collides
                // with, and it still takes its space in `placed` — so it is
                // the others that give way to it.
                if (!candidate.selected) {
                  // Its OWN handle and not every handle on the map: the disc a
                  // label names is the one thing it must never sit on top of,
                  // while the other stations' discs are the reason their
                  // labels exist at all. An area's name has no disc of its own
                  // to clear — it sits at a centre its region draws nothing at
                  // — so there is no such box to test it against.
                  const ownHandle: LabelBox | null =
                    candidate.kind === "station"
                      ? {
                          left: centreX - LABEL_ANCHOR_CLEAR_PX,
                          top: centreY - LABEL_ANCHOR_CLEAR_PX,
                          right: centreX + LABEL_ANCHOR_CLEAR_PX,
                          bottom: centreY + LABEL_ANCHOR_CLEAR_PX,
                        }
                      : null;
                  if (
                    (ownHandle !== null && overlaps(box, ownHandle)) ||
                    placed.some((taken) => overlaps(taken, box))
                  ) {
                    return [];
                  }
                }
                placed.push(box);
                return [
                  {
                    candidate,
                    x: at.col + offset.x * scale,
                    y: at.row + offset.y * scale,
                  },
                ];
              });

              return (
                <>
                  {/* Keep-out polygons and typed zones, behind everything: an
                      area is the floor's own condition, and the road on top of
                      it is what an operator points at. A zone is told from a
                      keep-out by LINE STYLE and by its printed name, never by
                      hue alone — one consuming host spends no hue at all. */}
                  <g>
                    {drawnEntities
                      .filter((entity) => entity.points.length > 2)
                      .map((entity) => {
                        const points = entity.points
                          .map((corner) => {
                            const at = toRaster(corner);
                            return `${String(at.col)},${String(at.row)}`;
                          })
                          .join(" ");
                        const armed = armedAreaIds.has(entity.id);
                        const hovered = hoveredAreaId === entity.id;
                        const keepOut = entity.kind === "keep-out";
                        return (
                          <g key={entity.id} data-area-id={entity.id} data-area-kind={entity.kind}>
                            <polygon
                              points={points}
                              fill={
                                keepOut ? "var(--ds-tone-danger-bg)" : "var(--ds-tone-info-bg)"
                              }
                              stroke={
                                armed
                                  ? "var(--ds-tone-warning-fg)"
                                  : keepOut
                                    ? "var(--ds-tone-danger-fg)"
                                    : "var(--ds-tone-info-fg)"
                              }
                              strokeWidth={armed || hovered ? EDGE_SELECTED_WIDTH_PX : EDGE_WIDTH_PX}
                              {...(keepOut ? {} : { strokeDasharray: "6 4" })}
                              vectorEffect="non-scaling-stroke"
                            />
                          </g>
                        );
                      })}
                  </g>

                  {/* Keep-out walls and two-point zones: the segment IS the
                      element, so it is drawn at the weight of a wall rather
                      than the weight of a route. */}
                  <g>
                    {drawnEntities
                      .filter((entity) => entity.points.length <= 2)
                      .map((entity) => {
                        const from = entity.points[0];
                        const to = entity.points[1];
                        if (from === undefined || to === undefined) {
                          return null;
                        }
                        const a = toRaster(from);
                        const b = toRaster(to);
                        const pathId = ringPathId(entity.id);
                        const armed = selectedPathIds.has(pathId);
                        const hovered = hoveredPathId === pathId;
                        const keepOut = entity.kind === "keep-out";
                        return (
                          <line
                            key={entity.id}
                            data-area-id={entity.id}
                            data-area-kind={entity.kind}
                            x1={a.col}
                            y1={a.row}
                            x2={b.col}
                            y2={b.row}
                            stroke={
                              armed
                                ? "var(--ds-tone-warning-fg)"
                                : keepOut
                                  ? "var(--ds-tone-danger-fg)"
                                  : "var(--ds-tone-info-fg)"
                            }
                            strokeWidth={
                              armed || hovered ? WALL_SELECTED_WIDTH_PX : WALL_WIDTH_PX
                            }
                            strokeLinecap="round"
                            {...(keepOut ? {} : { strokeDasharray: "8 5" })}
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                  </g>

                  {/* The road graph's lines, with the direction an operator
                      set drawn ON the line: `oneWay` is otherwise a fact only
                      the inspector knows. */}
                  <g>
                    {drawn.edges.map((edge) => {
                      const from = pointById(drawn, edge.src);
                      const to = pointById(drawn, edge.dst);
                      if (from === undefined || to === undefined) {
                        return null;
                      }
                      const a = toRaster(from);
                      const b = toRaster(to);
                      const selected = selectedPathIds.has(edge.id);
                      const hovered = hoveredPathId === edge.id;
                      const stroke = selected ? "var(--ds-tone-warning-fg)" : "var(--ds-accent)";
                      const arrow =
                        edge.oneWay === "0"
                          ? null
                          : arrowPath(a, b, edge.oneWay === "1" ? 1 : -1, scale);
                      return (
                        // The group carries the direction and the line
                        // carries the IDENTITY: `data-edge-id` is what a
                        // reviewer and the e2e read endpoint coordinates off,
                        // and a wrapper cannot answer `x1`.
                        <g key={edge.id} data-one-way={edge.oneWay}>
                          <line
                            data-edge-id={edge.id}
                            x1={a.col}
                            y1={a.row}
                            x2={b.col}
                            y2={b.row}
                            stroke={stroke}
                            strokeWidth={
                              selected
                                ? EDGE_SELECTED_WIDTH_PX
                                : hovered
                                  ? EDGE_HOVER_WIDTH_PX
                                  : EDGE_WIDTH_PX
                            }
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          {arrow === null ? null : <path d={arrow} fill={stroke} />}
                        </g>
                      );
                    })}
                  </g>

                  {/* The run in progress, and the leg that would be placed
                      next. Without the band an armed mode is a mode with no
                      preview: the operator cannot see the corner before they
                      commit it. */}
                  {drawing === null || drawing.length === 0 ? null : (
                    <g data-run="true">
                      {drawing.length < 2 ? null : (
                        <polyline
                          points={drawing
                            .map((corner) => {
                              const at = toRaster(corner);
                              return `${String(at.col)},${String(at.row)}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="var(--ds-accent)"
                          strokeWidth={EDGE_SELECTED_WIDTH_PX}
                          strokeDasharray="6 4"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                      {drawing.map((corner, index) => {
                        const at = toRaster(corner);
                        return (
                          <EditHandle
                            key={`run-${String(index)}`}
                            x={at.col}
                            y={at.row}
                            kind="anchor"
                            unitsPerPixel={scale}
                            state={index === 0 ? "primary" : "selected"}
                          />
                        );
                      })}
                      {pending === null
                        ? null
                        : (() => {
                            const from = toRaster(pending.from);
                            const to = toRaster(pending.to);
                            const first = drawing[0];
                            const closeTo =
                              mode === "draw-area" && first !== undefined && drawing.length >= 3
                                ? toRaster(first)
                                : null;
                            return (
                              <EditRubberBand
                                from={{ x: from.col, y: from.row }}
                                to={{ x: to.col, y: to.row }}
                                state={pending.resolved.constrained ? "constrained" : "free"}
                                {...(closeTo === null
                                  ? {}
                                  : { closeTo: { x: closeTo.col, y: closeTo.row } })}
                              />
                            );
                          })()}
                    </g>
                  )}

                  {/* Coarse input has no hover, so the grammar offers its
                      insertion points permanently there and only there. */}
                  {surface.persistentGhosts.map((ghost) => {
                    const at = toRaster(ghost.at);
                    return (
                      <EditGhostHandle
                        key={`${ghost.pathId}-${String(ghost.segmentIndex)}`}
                        x={at.col}
                        y={at.row}
                        unitsPerPixel={scale}
                        state="idle"
                      />
                    );
                  })}
                  {insertionGhost === null ? null : (
                    <EditGhostHandle
                      x={toRaster(insertionGhost.at).col}
                      y={toRaster(insertionGhost.at).row}
                      unitsPerPixel={scale}
                      state="hover"
                    />
                  )}
                  {ringGhost === null ? null : (
                    <EditGhostHandle
                      x={toRaster(ringGhost.at).col}
                      y={toRaster(ringGhost.at).row}
                      unitsPerPixel={scale}
                      state="hover"
                    />
                  )}
                  {insertPreview === null ? null : (
                    <EditGhostHandle
                      x={toRaster(insertPreview.at).col}
                      y={toRaster(insertPreview.at).row}
                      unitsPerPixel={scale}
                      state="target"
                    />
                  )}

                  {/* The road graph's vertices. */}
                  <g>
                    {drawn.points.map((point) => {
                      const at = toRaster(point);
                      const station = point.type === STATION_TYPE;
                      return (
                        // The wrapper carries the identity: `EditHandle` takes
                        // no passthrough SVG props by contract, so naming the
                        // drawn object is the host's job.
                        <g
                          key={point.id}
                          data-point-id={point.id}
                          data-point-kind={station ? "station" : "path-point"}
                        >
                          <EditHandle
                            x={at.col}
                            y={at.row}
                            // A named place is drawn as a place; a coordinate
                            // the robot drives through is drawn as an anchor.
                            // The affordance owns both shapes and both sizes.
                            kind={station ? "place" : "anchor"}
                            unitsPerPixel={scale}
                            state={handleStateOf(point.id)}
                            // The world's y runs up and the raster's rows run
                            // down, so the DRAWN angle is the negative of the
                            // stored yaw. That one sign is the whole frame
                            // conversion for a direction.
                            {...(station ? { heading: -point.yaw } : {})}
                          />
                        </g>
                      );
                    })}
                  </g>

                  {/* A two-point entry's ends are handles at all times: they
                      are the only thing there is to grab, and a wall whose
                      ends could not be seen could not be adjusted. An armed
                      area's corners appear when it is armed, which is also
                      when the grammar starts offering them. */}
                  <g>
                    {drawnEntities.map((entity) => {
                      const isWall = entity.points.length <= 2;
                      if (!isWall && !armedAreaIds.has(entity.id)) {
                        return null;
                      }
                      return (
                        <g key={`corners-${entity.id}`} data-area-corners={entity.id}>
                          {entity.points.map((corner, index) => {
                            const at = toRaster(corner);
                            return (
                              <g
                                key={index}
                                data-corner-index={index}
                                {...(isWall
                                  ? { "data-point-id": ringHandleId(entity.id, index) }
                                  : {})}
                              >
                                <EditHandle
                                  x={at.col}
                                  y={at.row}
                                  kind="anchor"
                                  unitsPerPixel={scale}
                                  state={
                                    isWall
                                      ? handleStateOf(ringHandleId(entity.id, index))
                                      : ringVertexStateOf(entity.id, index)
                                  }
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </g>

                  {/* Each area's own name, at its centre: what kind it is and
                      which zone type, in words, for the host that spends no
                      hue and for the operator who should not have to consult a
                      legend. Drawn from the SAME `labels` the station names
                      come from — the pass decided which of both kinds fit —
                      and painted before them because a station's name is the
                      one the operator reads first. */}
                  <g>
                    {labels
                      .filter((label) => label.candidate.kind === "area")
                      .map((label) => (
                        <text
                          key={`area-label-${label.candidate.id}`}
                          data-area-label={label.candidate.id}
                          // Both kinds answer this one, so a reviewer or an
                          // e2e can enumerate every DRAWN name in one query
                          // and check that none of them overlap.
                          data-map-label={label.candidate.id}
                          data-map-label-kind="area"
                          x={label.x}
                          y={label.y}
                          textAnchor={LABEL_TEXT_ANCHOR.area}
                          fontSize={LABEL_FONT_SIZE_PX.area * scale}
                          fontFamily="var(--ds-font-sans)"
                          fill="var(--ds-text)"
                          stroke="var(--ds-surface)"
                          strokeWidth={LABEL_HALO_PX * scale}
                          paintOrder="stroke"
                        >
                          {label.candidate.text}
                        </text>
                      ))}
                  </g>

                  <g>
                    {labels
                      .filter((label) => label.candidate.kind === "station")
                      .map((label) => (
                        <text
                          key={`label-${label.candidate.id}`}
                          // The drawn object's own identity, like the handles'
                          // `data-point-id`: it is what lets a reviewer and the
                          // e2e ask which names survived a given zoom.
                          data-station-label={label.candidate.id}
                          data-map-label={label.candidate.id}
                          data-map-label-kind="station"
                          x={label.x}
                          y={label.y}
                          textAnchor={LABEL_TEXT_ANCHOR.station}
                          fontSize={LABEL_FONT_SIZE_PX.station * scale}
                          fontFamily="var(--ds-font-sans)"
                          fill="var(--ds-text)"
                          stroke="var(--ds-surface)"
                          strokeWidth={LABEL_HALO_PX * scale}
                          paintOrder="stroke"
                        >
                          {label.candidate.text}
                        </text>
                      ))}
                  </g>

                  {revealed === null || revealedPoint === undefined ? null : (
                    <g data-knob-for={revealedPoint.id}>
                      <EditHeadingKnob
                        x={toRaster(revealedPoint).col}
                        y={toRaster(revealedPoint).row}
                        angle={-revealedPoint.yaw}
                        armPx={HEADING_ARM_PX * scale}
                        unitsPerPixel={scale}
                        state={
                          drag !== null && drag.kind === "rotate"
                            ? "dragging"
                            : affordance.kind === "knob"
                              ? "hover"
                              : "idle"
                        }
                      />
                    </g>
                  )}

                  {snap === null || resolved === null
                    ? null
                    : (() => {
                        // The mark sits where the gesture LANDED; the hairline
                        // runs back to what caught it, which is the whole of
                        // "why is it there".
                        const landed = toRaster(resolved.at);
                        const caught = toRaster(snap.at);
                        return (
                          <EditSnapGuide
                            at={{ x: landed.col, y: landed.row }}
                            kind={snap.kind}
                            from={{ x: caught.col, y: caught.row }}
                            to={{ x: landed.col, y: landed.row }}
                            unitsPerPixel={scale}
                          />
                        );
                      })()}

                  {marquee === null ? null : (
                    <EditMarquee
                      from={{ x: toRaster(marquee.from).col, y: toRaster(marquee.from).row }}
                      to={{ x: toRaster(marquee.to).col, y: toRaster(marquee.to).row }}
                    />
                  )}
                </>
              );
            }}
          </MapCanvas>

          {mode !== "direct" || selection.primary === null || anchorAt === null ? null : (
            <SelectionActions
              document={document}
              target={selection.primary}
              extraSelected={selection.targets.length - 1}
              left={anchorAt.left}
              top={anchorAt.top}
              boxHeightPx={canvasHeightPx}
              onEdit={apply}
              onDeleteSelection={deleteSelection}
              onSelect={selectOnly}
            />
          )}
        </div>

        {/* The native twin. Everything the canvas can do is reachable here,
            which is why the canvas itself takes no focus and carries no ARIA.
            Its FIRST section is the selection, not a list of the whole scene:
            the canvas is the primary surface and this is the accessible route
            to the same operations, not a spreadsheet the operator has to
            drive the map from. */}
        <div style={{ display: "grid", gap: "var(--ds-space-sm)", minWidth: 0 }}>
          <SelectionInspector
            document={document}
            selection={selection}
            summary={selectionSummary}
            onEdit={apply}
            onDeleteSelection={deleteSelection}
            onSelect={selectOnly}
          />

          {notice === null ? null : (
            <p role="status" style={{ ...hint, color: "var(--ds-tone-warning-fg)" }}>
              {notice}
            </p>
          )}
          {armedNote === null ? null : <p style={hint}>{armedNote}</p>}

          <ElementGroup
            name="Stations"
            count={document.points.filter((point) => point.type === STATION_TYPE).length}
            open
          >
            {document.points
              .filter((point) => point.type === STATION_TYPE)
              .map((point) => (
                <ElementRow
                  key={point.id}
                  label={`◉ ${pointLabel(point)}`}
                  selected={selectedPointIds.has(point.id)}
                  onSelect={(additive) => {
                    selectRow({ kind: "handle", id: point.id }, additive);
                  }}
                />
              ))}
          </ElementGroup>

          <ElementGroup
            name="Path points"
            count={document.points.filter((point) => point.type !== STATION_TYPE).length}
          >
            {document.points
              .filter((point) => point.type !== STATION_TYPE)
              .map((point) => (
                <ElementRow
                  key={point.id}
                  label={`○ ${pointLabel(point)}`}
                  selected={selectedPointIds.has(point.id)}
                  onSelect={(additive) => {
                    selectRow({ kind: "handle", id: point.id }, additive);
                  }}
                />
              ))}
          </ElementGroup>

          <ElementGroup name="Lines" count={document.edges.length}>
            {document.edges.map((edge) => (
              <ElementRow
                key={edge.id}
                label={`— ${edgeLabel(document, edge)}`}
                selected={selectedPathIds.has(edge.id)}
                onSelect={(additive) => {
                  selectRow({ kind: "path", id: edge.id }, additive);
                }}
              />
            ))}
          </ElementGroup>

          <ElementGroup name="Keep-outs" count={document.keepOuts.length}>
            {entities
              .filter((entity) => entity.kind === "keep-out")
              .map((entity) => {
                const target = targetForRing(entity);
                return (
                  <ElementRow
                    key={entity.id}
                    label={`▢ ${entity.label}`}
                    selected={
                      target.kind === "area"
                        ? selectedAreaIds.has(entity.id)
                        : selectedPathIds.has(ringPathId(entity.id))
                    }
                    onSelect={(additive) => {
                      selectRow(target, additive);
                    }}
                  />
                );
              })}
          </ElementGroup>

          <ElementGroup name="Zones" count={document.spliceAreas.length}>
            {entities
              .filter((entity) => entity.kind === "splice")
              .map((entity) => {
                const target = targetForRing(entity);
                return (
                  <ElementRow
                    key={entity.id}
                    label={`▨ ${entity.label}`}
                    selected={
                      target.kind === "area"
                        ? selectedAreaIds.has(entity.id)
                        : selectedPathIds.has(ringPathId(entity.id))
                    }
                    onSelect={(additive) => {
                      selectRow(target, additive);
                    }}
                  />
                );
              })}
          </ElementGroup>
        </div>
      </div>

      <p style={hint}>
        <strong>Select mode:</strong> drag empty floor to pan · wheel to zoom about the pointer ·
        click a vertex, a line or an area to select · Shift-click to add · Shift-drag empty floor
        for a marquee · drag a selection to move it (Shift constrains to 45°) · Alt-click a vertex
        or a corner to remove it · select a line, then Alt-click, Alt-drag or double-click it to
        add a point on it · approach a selected station to reveal its heading knob and drag it to
        turn the station (Shift quantises to 15°) · Delete removes the selection, Escape clears it.
        Whatever is selected also brings up its own controls on the map, which is where remove,
        rename, retype and add-corner live for a mouse.
      </p>

      {/* What a picture cannot say. Rendered only where a host asked for it:
          the reviewed editor and the measured editor are the same program,
          and this is the one place they differ. */}
      {instrument === undefined
        ? null
        : instrument({
            points: document.points,
            edges: document.edges,
            keepOuts: document.keepOuts,
            spliceAreas: document.spliceAreas,
            selection,
            selectionSummary,
            viewport,
            // The counter-scale, restated from the same kernel number the
            // tolerances are built from rather than measured a second way.
            scale: metresPerPixel / FRAME.resolution,
            undoDepth: session.past.length,
            redoDepth: session.future.length,
            affordance: affordance.kind,
            cursor: surface.cursor.name,
            marqueeCandidates: marquee === null ? null : marquee.candidates.length,
            magnet,
            snap: snap === null ? null : snap.kind,
            notice,
            mode,
            runLength,
          })}
    </div>
  );
}

/**
 * The filled triangle that says which way a one-way line may be driven.
 *
 * Drawn at the line's midpoint, in the raster's pixel space, at a constant
 * SCREEN size — like every other affordance on this surface.
 *
 * @param a The line's first end, in raster pixels.
 * @param b The line's second end, in raster pixels.
 * @param sense `1` for a → b, `-1` for b → a.
 * @param scale Raster units per screen pixel.
 * @returns The path's `d`, or null for a line with no length.
 */
function arrowPath(
  a: { readonly col: number; readonly row: number },
  b: { readonly col: number; readonly row: number },
  sense: number,
  scale: number,
): string | null {
  const dx = b.col - a.col;
  const dy = b.row - a.row;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return null;
  }
  const ux = (dx / length) * sense;
  const uy = (dy / length) * sense;
  const midX = (a.col + b.col) / 2;
  const midY = (a.row + b.row) / 2;
  const reach = ARROW_LENGTH_PX * scale;
  const half = ARROW_HALF_WIDTH_PX * scale;
  const tipX = midX + ux * reach;
  const tipY = midY + uy * reach;
  const baseX = midX - ux * reach * 0.5;
  const baseY = midY - uy * reach * 0.5;
  return (
    `M ${String(tipX)} ${String(tipY)} ` +
    `L ${String(baseX - uy * half)} ${String(baseY + ux * half)} ` +
    `L ${String(baseX + uy * half)} ${String(baseY - ux * half)} Z`
  );
}

// ---------------------------------------------------------------------------
// The contextual chrome: what a mouse operator can SEE about the selection
// ---------------------------------------------------------------------------

const actionsStyle: CSSProperties = {
  position: "absolute",
  zIndex: 1,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--ds-space-2xs)",
  maxWidth: `${String(ACTIONS_MAX_WIDTH_PX)}px`,
  padding: "var(--ds-space-2xs) var(--ds-space-xs)",
  border: "1px solid var(--ds-border-strong)",
  borderRadius: "var(--ds-radius-control)",
  background: "var(--ds-surface)",
  color: "var(--ds-text)",
  fontSize: "var(--ds-font-size-label)",
};

type SelectionActionsProps = {
  readonly document: SceneDocument;
  readonly target: EditTarget;
  readonly extraSelected: number;
  readonly left: number;
  readonly top: number;
  readonly boxHeightPx: number;
  readonly onEdit: (edit: SceneEdit) => ApplyResult;
  readonly onDeleteSelection: () => void;
  readonly onSelect: (target: EditTarget) => void;
};

/**
 * The selection's own controls, over the map, as native chrome.
 *
 * ## Why this does not weaken invariant A'
 *
 * A' governs what the GRAMMAR makes of a press on the editing surface, and
 * this is not on the editing surface: the grammar's pointer props are on the
 * raster `<img>` inside `<MapCanvas/>`, and this bar is a sibling of that
 * canvas, so a press here never reaches them. A fine single click on the map
 * itself is still non-destructive, and removal still requires Alt, this
 * chrome, or the twin — the three routes A' already names, with this one now
 * VISIBLE.
 *
 * It is also not the badge the adopted spec removed. A badge floats beside
 * every element, unbidden, next to the precise gesture an operator is in the
 * middle of; this appears once, for the selection they have already made, and
 * costs a deliberate press on a labelled button that assistive technology can
 * read and a keyboard can reach.
 *
 * ## Why it is clamped in CSS and not measured
 *
 * `left` is clamped against `calc(100% - <width>)`, which the browser resolves
 * against the box the bar is positioned in. So the bar stays inside the
 * viewport at every container width with no `ResizeObserver`, no measured
 * state, and no frame in which it is drawn in the wrong place.
 */
function SelectionActions({
  document,
  target,
  extraSelected,
  left,
  top,
  boxHeightPx,
  onEdit,
  onDeleteSelection,
  onSelect,
}: SelectionActionsProps) {
  const style: CSSProperties = {
    ...actionsStyle,
    left: `clamp(0px, ${String(Math.round(left))}px, calc(100% - ${String(
      ACTIONS_MAX_WIDTH_PX,
    )}px))`,
    top: `clamp(0px, ${String(Math.round(top))}px, ${String(
      Math.max(0, boxHeightPx - ACTIONS_RESERVED_HEIGHT_PX),
    )}px)`,
  };

  return (
    <div
      role="group"
      aria-label={`Controls for ${nameOf(document, target)}`}
      data-selection-actions="true"
      style={style}
    >
      <span style={{ color: "var(--ds-text-muted)" }}>
        {nameOf(document, target)}
        {extraSelected > 0 ? ` +${String(extraSelected)}` : ""}
      </span>
      <TargetActions
        document={document}
        target={target}
        onEdit={onEdit}
        onSelect={onSelect}
        compact
      />
      <Button size="sm" variant="danger" onClick={onDeleteSelection}>
        {extraSelected > 0 ? `Remove ${String(extraSelected + 1)}` : "Remove"}
      </Button>
    </div>
  );
}

type TargetActionsProps = {
  readonly document: SceneDocument;
  readonly target: EditTarget;
  readonly onEdit: (edit: SceneEdit) => ApplyResult;
  readonly onSelect: (target: EditTarget) => void;
  /** True in the floating bar, where there is room for the verbs and not the prose. */
  readonly compact?: boolean;
};

/**
 * Every update one selected element accepts, as native controls.
 *
 * Rendered twice, from one definition: in the floating bar over the canvas
 * (`compact`) and in the twin's inspector. Two definitions would be two sets
 * of verbs, and the one an operator could not reach would be the one that
 * rotted.
 */
function TargetActions({ document, target, onEdit, onSelect, compact = false }: TargetActionsProps) {
  if (target.kind === "handle") {
    const ring = parseRingHandleId(target.id);
    if (ring !== null) {
      return (
        <RingCornerActions
          document={document}
          entityId={ring.entityId}
          index={ring.index}
          onEdit={onEdit}
        />
      );
    }
    const point = pointById(document, target.id);
    if (point === undefined) {
      return null;
    }
    return (
      <>
        {point.type === STATION_TYPE ? (
          <RenameField
            key={point.id}
            point={point}
            onRename={(name) => {
              onEdit(setPointLabel(document, point.id, name));
            }}
          />
        ) : null}
        <Button
          size="sm"
          onClick={() => {
            onEdit(
              setPointType(
                document,
                point.id,
                point.type === STATION_TYPE ? PATH_POINT_TYPE : STATION_TYPE,
              ),
            );
          }}
        >
          {point.type === STATION_TYPE ? "Make path point" : "Make station"}
        </Button>
        {compact ? null : (
          <span style={hint}>
            Heading {String(Math.round((point.yaw * 180) / Math.PI))}° — approach the station on the
            map and drag its knob to turn it.
          </span>
        )}
      </>
    );
  }

  if (target.kind === "vertex") {
    return (
      <RingCornerActions
        document={document}
        entityId={target.areaId}
        index={target.index}
        onEdit={onEdit}
      />
    );
  }

  if (target.kind === "area") {
    return <RingActions document={document} entityId={target.id} onEdit={onEdit} />;
  }

  const proxy = parseRingPathId(target.id);
  if (proxy !== null) {
    return (
      <RingActions
        document={document}
        entityId={proxy}
        onEdit={onEdit}
        onPromoted={() => {
          onSelect({ kind: "area", id: proxy });
        }}
      />
    );
  }

  const edge = edgeById(document, target.id);
  if (edge === undefined) {
    return null;
  }
  const nextOneWay: OneWay = edge.oneWay === "0" ? "1" : edge.oneWay === "1" ? "2" : "0";
  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          onEdit(setEdgeOneWay(document, edge.id, nextOneWay));
        }}
      >
        {`Direction: ${ONE_WAY_LABELS[edge.oneWay]}`}
      </Button>
      {/* Narrowness is a numeral with three named values and no natural
          gesture, so it is a labelled select — and only where there is room
          for one. The floating bar keeps the two verbs an operator reaches for
          while pointing at the map. */}
      {compact ? null : (
        <Select
          selectSize="sm"
          aria-label="Narrowness"
          value={edge.single}
          onChange={(event) => {
            const chosen = event.target.value;
            if (chosen !== "0" && chosen !== "1" && chosen !== "2") {
              return;
            }
            onEdit(setEdgeSingle(document, edge.id, chosen));
          }}
        >
          {(["0", "1", "2"] as const).map((value) => (
            <option key={value} value={value}>
              {SINGLE_LABELS[value]}
            </option>
          ))}
        </Select>
      )}
      <Button
        size="sm"
        onClick={() => {
          const at = edgeMidpoint(document, edge.id);
          if (at === null) {
            return;
          }
          const split = onEdit(splitEdge(document, edge.id, at));
          if (split.created !== null) {
            onSelect({ kind: "handle", id: split.created });
          }
        }}
      >
        Add point
      </Button>
    </>
  );
}

type RingActionsProps = {
  readonly document: SceneDocument;
  readonly entityId: string;
  readonly onEdit: (edit: SceneEdit) => ApplyResult;
  readonly onPromoted?: () => void;
};

/** What a whole keep-out entry or typed zone accepts. */
function RingActions({ document, entityId, onEdit, onPromoted }: RingActionsProps) {
  const held = ringOf(document, entityId);
  if (held === null) {
    return null;
  }
  const splice = spliceAreaById(document, entityId);
  const side = widestRingSide(held.points);
  return (
    <>
      {splice === undefined ? null : (
        <Select
          selectSize="sm"
          aria-label="Zone type"
          value={splice.type}
          onChange={(event) => {
            onEdit(setSpliceAreaType(document, entityId, event.target.value));
          }}
        >
          {SPLICE_AREA_TYPES.map((type) => (
            <option key={type} value={type}>
              {spliceAreaTypeLabel(type)}
            </option>
          ))}
        </Select>
      )}
      <Button
        size="sm"
        disabled={side === null}
        onClick={() => {
          if (side === null) {
            return;
          }
          const wasWall = held.points.length <= 2;
          if (!onEdit(insertRingVertex(document, entityId, side.edgeIndex, side.at)).committed) {
            return;
          }
          if (wasWall && onPromoted !== undefined) {
            // Two points became three, so the entry stopped being a segment
            // and became an area — including to the grammar, which now hits
            // it by its interior. Selecting it as an area is what keeps the
            // operator's selection on the thing they were just editing.
            onPromoted();
          }
        }}
      >
        Add corner
      </Button>
    </>
  );
}

type RingCornerActionsProps = {
  readonly document: SceneDocument;
  readonly entityId: string;
  readonly index: number;
  readonly onEdit: (edit: SceneEdit) => ApplyResult;
};

/** What one corner of a keep-out entry or a zone accepts. */
function RingCornerActions({ document, entityId, index, onEdit }: RingCornerActionsProps) {
  const held = ringOf(document, entityId);
  if (held === null) {
    return null;
  }
  return (
    <>
      <span style={{ color: "var(--ds-text-muted)" }}>
        {`corner ${String(index + 1)} of ${String(held.points.length)}`}
      </span>
      <Button
        size="sm"
        onClick={() => {
          const side = widestRingSide(held.points);
          if (side === null) {
            return;
          }
          onEdit(insertRingVertex(document, entityId, side.edgeIndex, side.at));
        }}
      >
        Add corner
      </Button>
    </>
  );
}

type RenameFieldProps = {
  readonly point: RoadPoint;
  readonly onRename: (name: string) => void;
};

/**
 * A station's label, as a text field.
 *
 * Renaming has no pointer gesture — a name is typed — so it lives in chrome,
 * exactly as the console's own scene editor does it (`useSceneEditor`'s
 * `renamePoint`). The field is mounted with a `key` of the station's id by its
 * caller, so selecting a different station remounts it with that station's
 * name instead of leaving the previous one's text behind.
 */
function RenameField({ point, onRename }: RenameFieldProps) {
  const [draft, setDraft] = useState(point.defineType ?? "");

  // The document is the truth: an undo, a redo or another route's rename has
  // to reach the field, and a field that kept its own stale text would be a
  // second opinion about the station's name.
  useEffect(() => {
    setDraft(point.defineType ?? "");
  }, [point.defineType]);

  const commit = () => {
    if (draft === (point.defineType ?? "")) {
      return;
    }
    onRename(draft);
  };

  return (
    <form
      style={{ display: "flex", gap: "var(--ds-space-2xs)", alignItems: "center" }}
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <Input
        inputSize="sm"
        aria-label={`Name of station ${point.id}`}
        value={draft}
        placeholder="unnamed"
        style={{ width: "9rem" }}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
      />
      <Button size="sm" type="submit">
        Rename
      </Button>
    </form>
  );
}

type SelectionInspectorProps = {
  readonly document: SceneDocument;
  readonly selection: EditSelection;
  readonly summary: string;
  readonly onEdit: (edit: SceneEdit) => ApplyResult;
  readonly onDeleteSelection: () => void;
  readonly onSelect: (target: EditTarget) => void;
};

/**
 * The twin's first section: what is selected, and everything it accepts.
 *
 * This is what stopped the twin being a wall of rows. The scene's inventory is
 * still below, grouped and collapsed, for finding a thing that is off-screen;
 * the section an operator actually works in is this one, and it says the same
 * verbs the floating bar does because both render {@link TargetActions}.
 */
function SelectionInspector({
  document,
  selection,
  summary,
  onEdit,
  onDeleteSelection,
  onSelect,
}: SelectionInspectorProps) {
  const primary = selection.primary;
  return (
    <section style={sectionStyle} aria-label="Selection">
      <p style={{ ...hint, color: "var(--ds-text)" }}>
        <strong>Selected:</strong> {selection.targets.length === 0 ? "nothing" : summary}
        {selection.targets.length > 1 ? ` (+${String(selection.targets.length - 1)} more)` : ""}
      </p>
      {primary === null ? (
        <p style={hint}>
          Click something on the map, or a row below. Everything the map can do is here too.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--ds-space-2xs)",
              alignItems: "center",
            }}
          >
            <TargetActions document={document} target={primary} onEdit={onEdit} onSelect={onSelect} />
          </div>
          <PrimaryFacts document={document} target={primary} />
          <div>
            <Button size="sm" variant="danger" onClick={onDeleteSelection}>
              Remove selected
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/** The numbers a picture cannot state: coordinates, counts, vendor numerals. */
function PrimaryFacts({
  document,
  target,
}: {
  readonly document: SceneDocument;
  readonly target: EditTarget;
}) {
  const at = anchorOf(document, target);
  const lines: string[] = [];
  if (target.kind === "handle") {
    const ring = parseRingHandleId(target.id);
    const point = ring === null ? pointById(document, target.id) : undefined;
    if (point !== undefined) {
      lines.push(`type ${String(point.type)} · yaw ${point.yaw.toFixed(3)} rad`);
    }
  }
  if (target.kind === "path") {
    const proxy = parseRingPathId(target.id);
    const edge = proxy === null ? edgeById(document, target.id) : undefined;
    if (edge !== undefined) {
      lines.push(`oneWay "${edge.oneWay}" · single "${edge.single}"`);
    }
  }
  const held =
    target.kind === "area"
      ? ringOf(document, target.id)
      : target.kind === "path"
        ? ringOf(document, parseRingPathId(target.id) ?? "")
        : null;
  if (held !== null) {
    lines.push(
      `${String(held.points.length)} points — ${keepOutKindOf(held.points)} (the count decides)`,
    );
  }
  if (at !== null) {
    lines.push(`at ${at.x.toFixed(3)}, ${at.y.toFixed(3)} m`);
  }
  return (
    <p style={{ ...hint, fontFamily: "var(--ds-font-mono)" }}>
      {lines.length === 0 ? "—" : lines.join(" · ")}
    </p>
  );
}

/**
 * One collapsible group of the scene's inventory.
 *
 * `<details>` and not a list of everything: 22 vertices plus 22 lines plus the
 * keep-out geometry is a wall nobody reads, and the wall is what made the
 * previous revision's twin the editor's primary surface. The count is on the
 * summary so a closed group still answers "how many".
 */
function ElementGroup({
  name,
  count,
  open = false,
  children,
}: {
  readonly name: string;
  readonly count: number;
  readonly open?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <details open={open}>
      <summary style={summaryStyle}>
        {name} ({count})
      </summary>
      {count === 0 ? (
        <p style={hint}>None yet — draw one on the map.</p>
      ) : (
        <ul style={listStyle}>{children}</ul>
      )}
    </details>
  );
}

/** One row of an inventory group: the accessible route to selecting a thing. */
function ElementRow({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: (additive: boolean) => void;
}) {
  return (
    <li>
      <button
        type="button"
        style={selected ? selectedRowStyle : rowStyle}
        aria-pressed={selected}
        onClick={(event) => {
          onSelect(event.shiftKey);
        }}
      >
        {label}
      </button>
    </li>
  );
}
