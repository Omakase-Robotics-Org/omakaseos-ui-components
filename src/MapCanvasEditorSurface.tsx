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
 * Copying nine hundred lines into the demo would have made the reviewed editor
 * and the PROVEN editor two different programs, free to drift apart silently —
 * exactly the failure a screenshot-free "the story compiles" gate cannot see.
 * So there is one editor, and the two hosts differ only in what they wrap it
 * in: the story renders it bare, and the demo passes {@link
 * MapCanvasEditorSurfaceProps.instrument} to publish the live state a spec has
 * to read (a document's committed coordinates, the viewport, the undo depth)
 * and cannot get out of pixels.
 *
 * This module is deliberately NOT exported from `src/index.ts`. It is a host
 * composed OF the library's primitives, not a primitive — the same standing
 * `DirectManipulationStoryCanvas` has (and the reason `spec/
 * storybook-coverage.spec.ts`, which accounts for the barrel's exports, places
 * no story obligation on it).
 *
 * `MapCanvas.stories.tsx` shows the canvas with no editing; this is the same
 * canvas with an editor on top, and between them they state the seam: the
 * canvas owns the picture, the transform and the two navigation gestures, and
 * knows nothing about any of the below.
 *
 * ## What a reviewer can do here, and what each gesture proves
 *
 *  - **Pan** — drag with the primary button over empty floor, or with the
 *    middle button anywhere. The primary press is only a CANDIDATE until it
 *    passes the grammar's press slop, so a click that does not travel is
 *    still a click (it deselects).
 *  - **Zoom** — wheel over the map. It zooms about the pointer, and every
 *    handle, knob and pick tolerance stays the same size on screen (see
 *    "screen-constant", below).
 *  - **Select** — click a vertex, or click a LINE. Lines are selectable
 *    because this host declares `capabilities.edges`, which is exactly what
 *    that declaration is for: a road graph's lines are objects, not the
 *    segments of an ordered route.
 *  - **Multi-select** — Shift-click adds; Shift-drag over empty floor draws a
 *    marquee and takes everything inside it.
 *  - **Move** — drag any selected vertex and the whole selection travels as
 *    ONE intent, and therefore as one step in the timeline. Shift constrains
 *    the drag to 45°.
 *  - **Delete** — Alt-click a vertex (it goes, and so does every line that
 *    ended on it), or use the Delete key / the twin's button.
 *  - **Insert** — hold Alt over a line to see the insertion marker and click,
 *    or Alt-DRAG to place the new vertex where you drop it, or double-click
 *    the line to insert exactly where you pointed. Each of the three splits
 *    the line into two, which is what a road graph means by adding a point
 *    to a way.
 *  - **Rotate** — approach a selected STATION and its heading knob appears
 *    (only within the grammar's arming radius, so nothing floats beside a
 *    precise gesture). Drag it to change the station's `yaw`; Shift
 *    quantises to 15°.
 *  - **Snap** — the magnet is on by default and its evidence is drawn: the
 *    mark shows what caught the position and the hairline shows where it came
 *    from. Turn it off in the toolbar and drag the same vertex again.
 *  - **Undo / redo** — every one of the above is one entry.
 *
 * ## Why the junctions need no special case
 *
 * Each edge is its OWN two-handle path (`{ id, handleIds: [src, dst] }`).
 * That is how a branching graph is expressed in a grammar whose paths are
 * ordered runs: vertices "0013", "0016" and "0017" are each the endpoint of
 * three lines, and because a vertex belongs to as many paths as it likes,
 * dragging one carries all three lines with it without this file knowing
 * anything about junctions. Modelling the graph as a few long paths instead
 * would have made those vertices ambiguous AND would be refused outright by
 * the edge capability, which declines to guess which segment of an ordered
 * route a click meant.
 *
 * ## Screen-constant affordances
 *
 * The overlay is drawn in the raster's own pixel space, so every radius,
 * every arm length and every pick tolerance is multiplied by the canvas'
 * `scale` (raster units per screen pixel) on its way in. A 9 px handle is 9
 * px at 0.3x and at 8x. This is the single property that makes the surface
 * feel like a map editor rather than a diagram, and forgetting it is why
 * handles balloon when an operator zooms in.
 *
 * ## Why the drawn objects carry `data-point-id` / `data-edge-id`
 *
 * They are the drawn object's own IDENTITY, not test hooks: the overlay is
 * `aria-hidden` decorative SVG, so a circle at (412, 233) is otherwise
 * anonymous to anything outside this file's closure — a reviewer inspecting
 * the DOM, and the e2e that has to measure ONE nominated handle's rendered
 * box across a zoom, alike. They are stated once, here, for both hosts, so
 * the reviewed picture and the measured picture cannot be different pictures.
 *
 * ## The native twin
 *
 * The canvas is a picture with decorative SVG over it: it takes no focus and
 * carries no ARIA. Everything it can do is also reachable from the list and
 * the buttons beside it — select a row, read what is selected, delete it,
 * undo. That is the contract this suite's editing surfaces hold to, and it is
 * why the SVG needs no keyboard behaviour of its own.
 */
import {
  useCallback,
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
  EditSnapGuide,
} from "./index";
import { MapCanvas, useMapCanvasProjector } from "./MapCanvas";
import {
  BADGE_RADIUS_PX,
  EMPTY_SELECTION,
  GHOST_PICK_RADIUS_PX,
  GHOST_RADIUS_PX,
  HANDLE_RADIUS_PX,
  KNOB_RADIUS_PX,
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
  EditProbe,
  EditScene,
  EditSelection,
  EditSession,
  EditTarget,
  EditTolerances,
  Vertex,
} from "./direct-manipulation";
import { metresPerScreenPixel, type MapViewport, type RasterFrame } from "./map-canvas";
import {
  CUC_1_NORTH_RASTER,
  CUC_1_NORTH_ROAD_GRAPH,
  type CucRoadPointType,
} from "./map-canvas/cuc-1-north.fixture";

const FRAME: RasterFrame = {
  pixelWidth: CUC_1_NORTH_RASTER.pixelWidth,
  pixelHeight: CUC_1_NORTH_RASTER.pixelHeight,
  resolution: CUC_1_NORTH_RASTER.resolution,
  originX: CUC_1_NORTH_RASTER.originX,
  originY: CUC_1_NORTH_RASTER.originY,
};

/** The vendor's vertex types: a named stop, and a point driven through. */
const STATION: CucRoadPointType = 2;
const PATH_POINT: CucRoadPointType = 100;

/** How far the heading knob sits from its station, in screen pixels. */
const HEADING_ARM_PX = 26;

/** The drawn weight of a line, in screen pixels (non-scaling stroke). */
const EDGE_WIDTH_PX = 2;
const EDGE_HOVER_WIDTH_PX = 3;
const EDGE_SELECTED_WIDTH_PX = 4;

/** A station's label, in screen pixels. */
const LABEL_SIZE_PX = 11;

/** Half-size of the snap mark, in screen pixels. */
const SNAP_MARK_HALF_PX = 5;

/** The halo that keeps a label legible over both floor and wall, in screen pixels. */
const LABEL_HALO_PX = 3;

/**
 * A station handle's drawn radius, in screen pixels.
 *
 * A station is drawn a quarter larger than a path point — it is a named place
 * rather than a coordinate the robot drives through — and the label's offsets
 * and its collision box are both stated as multiples of it, so there is one
 * number to change.
 */
const STATION_RADIUS_PX = HANDLE_RADIUS_PX * 1.25;

/** Where a label sits relative to its station, in screen pixels. */
const LABEL_OFFSET_X_PX = STATION_RADIUS_PX * 1.6;
const LABEL_OFFSET_Y_PX = STATION_RADIUS_PX * 1.2;

/**
 * The clear space demanded around a label, in screen pixels.
 *
 * Half of it is the halo the label paints outside its own glyphs
 * ({@link LABEL_HALO_PX} is centred on the outline), and the rest is the gap
 * that makes two surviving labels read as two labels rather than as one
 * run-on word touching at the edges.
 */
const LABEL_CLEARANCE_PX = LABEL_HALO_PX / 2 + 2;

export type EditorPoint = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Radians, world frame, x east and counter-clockwise positive. */
  readonly yaw: number;
  readonly type: CucRoadPointType;
  readonly defineType?: string;
};

export type EditorEdge = {
  readonly id: string;
  readonly src: string;
  readonly dst: string;
};

export type EditorDocument = {
  readonly points: readonly EditorPoint[];
  readonly edges: readonly EditorEdge[];
};

const SEED_DOCUMENT: EditorDocument = {
  points: CUC_1_NORTH_ROAD_GRAPH.points.map((point) => ({
    id: point.id,
    x: point.x,
    y: point.y,
    yaw: point.yaw,
    type: point.type,
    ...(point.defineType === undefined ? {} : { defineType: point.defineType }),
  })),
  edges: CUC_1_NORTH_ROAD_GRAPH.edges.map((edge) => ({
    id: edge.id,
    src: edge.src,
    dst: edge.dst,
  })),
};

/** The name a row, a readout and a label all use for one vertex. */
function pointLabel(point: EditorPoint): string {
  return point.defineType ?? `point ${point.id}`;
}

function pointById(document: EditorDocument, id: string): EditorPoint | undefined {
  return document.points.find((point) => point.id === id);
}

function edgeLabel(document: EditorDocument, edge: EditorEdge): string {
  const source = pointById(document, edge.src);
  const destination = pointById(document, edge.dst);
  const from = source === undefined ? edge.src : pointLabel(source);
  const to = destination === undefined ? edge.dst : pointLabel(destination);
  return `${from} → ${to}`;
}

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
 * One label's measured extent, relative to its own text anchor, in screen
 * pixels at {@link LABEL_SIZE_PX}.
 *
 * Measured rather than estimated from a character count: the suppression
 * below is only as good as the box it compares, and a box narrower than the
 * word inside it would let exactly the collision this exists to prevent
 * through. See {@link MapCanvasEditorSurface}'s measuring `<svg>`.
 */
type LabelExtent = {
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
};

/** A named station and the word drawn beside it. */
type LabelCandidate = {
  readonly point: EditorPoint;
  readonly text: string;
};

function movePoints(
  points: readonly EditorPoint[],
  moves: readonly { readonly id: string; readonly at: Vertex }[],
): readonly EditorPoint[] {
  if (moves.length === 0) {
    return points;
  }
  return points.map((point) => {
    const move = moves.find((candidate) => candidate.id === point.id);
    return move === undefined ? point : { ...point, x: move.at.x, y: move.at.y };
  });
}

/**
 * Split one line at a position, which is what "add a point to a way" means to
 * a road graph: the line becomes two lines meeting at a new path point.
 */
function splitEdge(
  document: EditorDocument,
  edgeId: string,
  at: Vertex,
  pointId: string,
  firstEdgeId: string,
  secondEdgeId: string,
): EditorDocument {
  const edge = document.edges.find((candidate) => candidate.id === edgeId);
  if (edge === undefined) {
    return document;
  }
  const inserted: EditorPoint = {
    id: pointId,
    x: at.x,
    y: at.y,
    yaw: 0,
    type: PATH_POINT,
  };
  return {
    points: [...document.points, inserted],
    edges: document.edges.flatMap((candidate) =>
      candidate.id === edgeId
        ? [
            { id: firstEdgeId, src: edge.src, dst: inserted.id },
            { id: secondEdgeId, src: inserted.id, dst: edge.dst },
          ]
        : [candidate],
    ),
  };
}

/** Remove vertices and lines, and every line left with a missing end. */
function deleteTargets(
  document: EditorDocument,
  targets: readonly EditTarget[],
): EditorDocument {
  const gonePoints = new Set(
    targets.flatMap((target) => (target.kind === "handle" ? [target.id] : [])),
  );
  const goneEdges = new Set(
    targets.flatMap((target) => (target.kind === "path" ? [target.id] : [])),
  );
  return {
    points: document.points.filter((point) => !gonePoints.has(point.id)),
    edges: document.edges.filter(
      (edge) =>
        !goneEdges.has(edge.id) && !gonePoints.has(edge.src) && !gonePoints.has(edge.dst),
    ),
  };
}

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
  maxHeight: "360px",
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

/**
 * The live state of the editor, for a host that must publish what a picture
 * cannot say.
 *
 * Handed to {@link MapCanvasEditorSurfaceProps.instrument} on every render.
 * The document here is the COMMITTED one (what undo would step back through),
 * not the one drawn mid-drag: a readout of a gesture in flight would be a
 * readout nobody could assert against twice.
 */
export type MapCanvasEditorReadout = {
  /** The committed document's vertices. */
  readonly points: readonly EditorPoint[];
  /** The committed document's lines. */
  readonly edges: readonly EditorEdge[];
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
   * such as the demo harness's half-width column, where a 260 px sidebar
   * would leave the map too small to point at.
   */
  readonly twin?: "aside" | "below";
  /**
   * Publish the live state. A host that has to assert on this editor from
   * outside — the e2e demo — renders its readouts here; the Storybook host
   * passes nothing and gets the editor bare.
   */
  readonly instrument?: (readout: MapCanvasEditorReadout) => ReactNode;
};

/** The whole editor: canvas, overlay, and the native twin beside it. */
export function MapCanvasEditorSurface({
  canvasHeightPx = 520,
  twin = "aside",
  instrument,
}: MapCanvasEditorSurfaceProps = {}) {
  const [session, setSession] = useState<EditSession<EditorDocument>>(() =>
    beginSession(SEED_DOCUMENT),
  );
  const [rawSelection, setSelection] = useState<EditSelection>(EMPTY_SELECTION);
  const [viewport, setViewport] = useState<MapViewport>({ zoom: 1, panX: 0, panY: 0 });
  const [fitNonce, setFitNonce] = useState(0);
  const [magnet, setMagnet] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const nextSequence = useRef(0);

  const document = session.current;
  const projector = useMapCanvasProjector(FRAME);

  // The canvas holds the image at its own pixel width, so this is exact from
  // the first frame and can never be the kernel's "not laid out yet" null —
  // see MapCanvas.tsx's header. Refused rather than defaulted, per the
  // workspace's fail-first rule.
  const metresPerPixel = metresPerScreenPixel(FRAME, FRAME.pixelWidth, viewport.zoom);
  if (metresPerPixel === null) {
    throw new Error("MapCanvasEditor: the canvas reported no drawn scale for a live viewport.");
  }

  // Every tolerance is a SCREEN pixel count converted at the current zoom, so
  // picking stays as tight at 8x as it is fitted.
  const tolerance = useMemo<EditTolerances>(
    () => ({
      handleM: metresPerPixel * HANDLE_RADIUS_PX,
      ghostM: metresPerPixel * GHOST_PICK_RADIUS_PX,
      knobM: metresPerPixel * KNOB_RADIUS_PX,
      badgeM: metresPerPixel * BADGE_RADIUS_PX,
      headingArmM: metresPerPixel * HEADING_ARM_PX,
      revealM: metresPerPixel * REVEAL_RADIUS_PX,
      snapM: metresPerPixel * SNAP_RADIUS_PX,
    }),
    [metresPerPixel],
  );

  const scene = useMemo<EditScene>(
    () => ({
      // Only a STATION carries a yaw, and only a handle with a yaw gets a
      // heading knob — so "a path point has no facing" is stated once, here,
      // instead of being special-cased wherever the knob is drawn or picked.
      handles: document.points.map((point) =>
        point.type === STATION
          ? { id: point.id, x: point.x, y: point.y, yaw: point.yaw }
          : { id: point.id, x: point.x, y: point.y },
      ),
      // One path per EDGE, two handles each: see the file header.
      paths: document.edges.map((edge) => ({
        id: edge.id,
        handleIds: [edge.src, edge.dst],
      })),
      areas: [],
    }),
    [document],
  );

  // Undo, redo and a delete can all take a target out from under the
  // selection. Pruning against the live scene is the grammar's own answer to
  // that (invariant G4) and is why nothing downstream has to re-check whether
  // what it holds still exists.
  const selection = useMemo(() => pruneSelection(rawSelection, scene), [rawSelection, scene]);

  const commitDocument = useCallback((next: EditorDocument) => {
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
          primary !== null && gone.some((removed) => sameTarget(removed, primary)) ? null : primary,
      };
    });
  }, []);

  const handleIntent = useCallback(
    (intent: EditIntent) => {
      setNotice(null);
      switch (intent.kind) {
        case "select-set":
          setSelection((current) => selectTargets(current, intent.targets, intent.additive));
          return;
        case "deselect":
          setSelection(EMPTY_SELECTION);
          return;
        case "move-set":
          commitDocument({
            ...document,
            points: movePoints(
              document.points,
              intent.moves.flatMap((move) =>
                move.target.kind === "handle" ? [{ id: move.target.id, at: move.at }] : [],
              ),
            ),
          });
          return;
        case "rotate":
          commitDocument({
            ...document,
            points: document.points.map((point) =>
              point.id === intent.id ? { ...point, yaw: intent.yaw } : point,
            ),
          });
          return;
        case "insert": {
          if (intent.afterIndex !== 0) {
            // Every path here is one edge, so there is exactly one segment to
            // insert into. Anything else means the scene stopped matching the
            // graph, and saying so beats inserting somewhere plausible.
            setNotice(
              `Refused: an insertion arrived for segment ${String(intent.afterIndex)} of a line that has only one.`,
            );
            return;
          }
          const sequence = nextSequence.current;
          nextSequence.current += 1;
          commitDocument(
            splitEdge(
              document,
              intent.pathId,
              intent.at,
              `n${String(sequence)}`,
              `${intent.pathId}a${String(sequence)}`,
              `${intent.pathId}b${String(sequence)}`,
            ),
          );
          return;
        }
        case "delete-set":
          commitDocument(deleteTargets(document, intent.targets));
          dropFromSelection(intent.targets);
          return;
        case "refused":
          setNotice(`Refused: ${intent.reason}`);
          return;
        default:
          // "place" / "draw" / run and area intents cannot arrive: the mode is
          // fixed to "direct" and no area capability is declared.
          return;
      }
    },
    [commitDocument, document, dropFromSelection],
  );

  const surface = useDirectEditSurface({
    mode: "direct",
    arming: "sustained",
    scene,
    selection,
    capabilities: {
      areas: {
        supported: false,
        reason: "A road graph stores no keep-out geometry; areas belong to the overlay editor.",
      },
      // The declaration this story exists to exercise: a click on a line
      // selects the line.
      edges: { supported: true },
    },
    tolerance,
    drawing: null,
    snapping: { enabled: magnet, toGeometry: true, toGrid: false },
    grid: null,
    toWorld: projector.toWorld,
    onIntent: handleIntent,
    onRefused: setNotice,
  });

  /**
   * Would a primary press here take hold of nothing?
   *
   * Answered by the GRAMMAR rather than by a rule of this file's own, so the
   * canvas pans in exactly the cases the editor is not already using: a press
   * on a handle, a line, or an insertion marker grips, and Shift on empty
   * floor grips too (it is the marquee).
   */
  const isBackgroundPress = useCallback(
    (clientX: number, clientY: number, modifiers: { readonly shift: boolean }): boolean => {
      const at = projector.toWorld(clientX, clientY);
      if (at === null) {
        return true;
      }
      const probe: EditProbe = {
        mode: "direct",
        modality: surface.modality,
        scene,
        selection,
        at,
        tolerance,
        capabilities: { areas: { supported: false, reason: "n/a" }, edges: { supported: true } },
        drawing: null,
        modifiers: { shift: modifiers.shift, alt: false },
        snapping: { enabled: magnet, toGeometry: true, toGrid: false },
        grid: null,
      };
      return resolveGrip(probe) === null;
    },
    [magnet, projector, scene, selection, surface.modality, tolerance],
  );

  const deleteSelection = useCallback(() => {
    if (selection.targets.length === 0) {
      return;
    }
    commitDocument(deleteTargets(document, selection.targets));
    dropFromSelection(selection.targets);
  }, [commitDocument, document, dropFromSelection, selection.targets]);

  useEditCommandKeys({
    enabled: true,
    armed: false,
    runLength: 0,
    hasSelection: selection.targets.length > 0,
    onFinishRun: () => undefined,
    onCancelRun: () => undefined,
    onDisarm: () => undefined,
    onDeselectAll: () => {
      setSelection(EMPTY_SELECTION);
    },
    onDeleteSelection: deleteSelection,
  });

  // ---- what is DRAWN: the document with the live gesture applied ---------
  const drag = surface.drag;
  const drawn = useMemo<EditorDocument>(() => {
    if (drag === null) {
      return document;
    }
    if (drag.kind === "move-set") {
      return {
        ...document,
        points: movePoints(
          document.points,
          drag.moves.flatMap((move) =>
            move.target.kind === "handle" ? [{ id: move.target.id, at: move.at }] : [],
          ),
        ),
      };
    }
    if (drag.kind === "rotate") {
      return {
        ...document,
        points: document.points.map((point) =>
          point.id === drag.id ? { ...point, yaw: drag.yaw } : point,
        ),
      };
    }
    return document;
  }, [document, drag]);

  const affordance = surface.affordance;
  const selectedPointIds = useMemo(
    () =>
      new Set(
        selection.targets.flatMap((target) => (target.kind === "handle" ? [target.id] : [])),
      ),
    [selection],
  );
  const selectedEdgeIds = useMemo(
    () =>
      new Set(selection.targets.flatMap((target) => (target.kind === "path" ? [target.id] : []))),
    [selection],
  );

  // ---- station labels ----------------------------------------------------
  // Thirteen stations carry a name, and at the zoom the map opens at their
  // names are longer than the distance between them: `entrancein` and
  // `entranceout` print on top of each other as "entranceinceout", which
  // names nothing. This is the map-renderer's answer rather than a smaller
  // font — a label that will not fit is NOT DRAWN, and zooming in, which is
  // what an operator does when they want to read a crowded area, separates
  // the stations and lets more of them appear.
  //
  // The order below is the whole of the "which one survives" decision, so it
  // is stated explicitly and it does not depend on anything that moves:
  //
  //  1. the SELECTED stations, which are drawn whatever they collide with —
  //     the operator asked for that one by name, and a label that vanishes
  //     because of what is near it is worse than one that overprints;
  //  2. every other named station, in ascending vertex id.
  //
  // Ascending id and not, say, distance from the centre or document order: a
  // priority that reads a POSITION re-ranks the whole set while a station is
  // being dragged, and a priority that reads document order re-ranks it when
  // an insertion appends a vertex. Either one makes labels flicker in and out
  // during an unrelated gesture, which is worse than the collision this is
  // fixing. A vertex id is assigned once and never moves.
  const labelCandidates = useMemo<readonly LabelCandidate[]>(() => {
    const named = drawn.points.flatMap((point) =>
      point.type === STATION && point.defineType !== undefined && point.defineType !== ""
        ? [{ point, text: point.defineType }]
        : [],
    );
    named.sort((a, b) => (a.point.id < b.point.id ? -1 : a.point.id > b.point.id ? 1 : 0));
    return [
      ...named.filter((candidate) => selectedPointIds.has(candidate.point.id)),
      ...named.filter((candidate) => !selectedPointIds.has(candidate.point.id)),
    ];
  }, [drawn, selectedPointIds]);

  // Every distinct word that has to be measured, in a stable order so the
  // hidden measuring `<svg>` below does not reorder its children on a
  // selection change.
  const labelTexts = useMemo(() => {
    const texts = [...new Set(labelCandidates.map((candidate) => candidate.text))];
    texts.sort();
    return texts;
  }, [labelCandidates]);

  // How wide each word actually is, in screen pixels, measured from the SAME
  // font the labels are drawn in (see the measuring `<svg>` in the returned
  // tree). An estimate from a character count would be the wrong instrument:
  // a box narrower than the word inside it lets through exactly the
  // overprinting this is here to stop.
  const [labelExtents, setLabelExtents] = useState<ReadonlyMap<string, LabelExtent>>(
    () => new Map(),
  );
  const measureRef = useRef<SVGSVGElement | null>(null);
  useLayoutEffect(() => {
    const svg = measureRef.current;
    if (svg === null) {
      throw new Error(
        "MapCanvasEditorSurface: the label measuring <svg> is not mounted, so no station " +
          "label's width is known. Suppression cannot be decided without it.",
      );
    }
    const measured = new Map<string, LabelExtent>();
    for (const node of svg.querySelectorAll("text")) {
      const text = node.getAttribute("data-label-measure");
      if (text === null) {
        continue;
      }
      const bbox = node.getBBox();
      if (!(bbox.width > 0) || !(bbox.height > 0)) {
        throw new Error(
          `MapCanvasEditorSurface: the label "${text}" measured ${String(bbox.width)} x ` +
            `${String(bbox.height)} px, which is not a box a word can occupy. Refusing to place ` +
            "labels against a measurement that cannot be true.",
        );
      }
      measured.set(text, { dx: bbox.x, dy: bbox.y, width: bbox.width, height: bbox.height });
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
  }, [labelTexts]);

  const handleStateOf = (
    point: EditorPoint,
  ): "idle" | "hover" | "selected" | "primary" | "dragging" => {
    if (
      drag !== null &&
      ((drag.kind === "move-set" &&
        drag.moves.some(
          (move) => move.target.kind === "handle" && move.target.id === point.id,
        )) ||
        (drag.kind === "rotate" && drag.id === point.id))
    ) {
      return "dragging";
    }
    const target: EditTarget = { kind: "handle", id: point.id };
    if (selection.primary !== null && sameTarget(selection.primary, target)) {
      return "primary";
    }
    if (selectedPointIds.has(point.id)) {
      return "selected";
    }
    if (affordance.kind === "handle" && affordance.id === point.id) {
      return "hover";
    }
    return "idle";
  };

  const hoveredEdgeId =
    affordance.kind === "path"
      ? affordance.id
      : affordance.kind === "path-edge" || affordance.kind === "ghost"
        ? affordance.pathId
        : null;

  const selectionSummary = ((primary: EditTarget | null): string => {
    if (primary === null) {
      return `${String(selection.targets.length)} selected`;
    }
    if (primary.kind === "handle") {
      const point = pointById(document, primary.id);
      return point === undefined ? primary.id : pointLabel(point);
    }
    if (primary.kind === "path") {
      const edge = document.edges.find((candidate) => candidate.id === primary.id);
      return edge === undefined ? primary.id : `line ${edgeLabel(document, edge)}`;
    }
    return primary.kind;
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
  const insertPreview = drag !== null && drag.kind === "insert" ? drag : null;
  const revealed = surface.revealedKnob;
  const revealedPoint = revealed === null ? undefined : pointById(drawn, revealed.id);

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      {/* The label ruler. Every station name is drawn here once, at the size
          labels are drawn on the map and in the same font, in an UNTRANSFORMED
          <svg> — so one user unit is one screen pixel and `getBBox()` answers
          in exactly the units the suppression above compares. Measuring the
          real element in the real cascade is the point: a width guessed from a
          character count, or from a canvas told a font string this file made
          up, would be a second opinion about the picture, and a box narrower
          than its word lets the overprinting straight back through.

          It is `visibility: hidden` and not `display: none` (which has no
          geometry to measure), takes no space (absolute, zero-sized), and is
          hidden from assistive technology because the names it holds are the
          same ones the native twin lists below in text. */}
      <svg
        ref={measureRef}
        aria-hidden="true"
        width={0}
        height={0}
        style={{ position: "absolute", width: 0, height: 0, visibility: "hidden" }}
        data-testid="mc-label-ruler"
      >
        {labelTexts.map((text) => (
          <text
            key={text}
            data-label-measure={text}
            x={0}
            y={0}
            fontSize={LABEL_SIZE_PX}
            fontFamily="var(--ds-font-sans)"
          >
            {text}
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

      <div
        style={{
          display: "grid",
          ...(twin === "aside"
            ? { gridTemplateColumns: "minmax(0, 1fr) 260px" }
            : { gridTemplateRows: "auto auto" }),
          gap: "var(--ds-space-md)",
          alignItems: "start",
        }}
      >
        <div style={{ height: `${String(canvasHeightPx)}px` }}>
          <MapCanvas
            frame={FRAME}
            src={CUC_1_NORTH_RASTER.dataUri}
            alt="Occupancy raster for the cuc_1_north map, with its editable road graph"
            viewport={viewport}
            onViewportChange={setViewport}
            fitNonce={fitNonce}
            projector={projector}
            surfaceProps={surface.surfaceProps}
            isBackgroundPress={isBackgroundPress}
          >
            {({ project, scale }) => {
              const handleRadius = HANDLE_RADIUS_PX * scale;
              const stationRadius = STATION_RADIUS_PX * scale;

              // Which station labels are drawn at THIS zoom. Walked in the
              // priority order `labelCandidates` fixed (selected first, then
              // ascending id), keeping each one that still finds clear space
              // and dropping the rest — the map-renderer's rule, and the
              // reason zooming in reveals more names rather than shrinking
              // the ones already there.
              //
              // The arithmetic is in SCREEN pixels with the pan left out:
              // `col / scale` is where a raster column falls on screen up to
              // that constant translation, and every offset and every extent
              // below is already a screen quantity. Working in raster units
              // instead would make the boxes grow with the zoom and the
              // collisions never resolve.
              const placed: LabelBox[] = [];
              const labels = labelCandidates.flatMap((candidate) => {
                const extent = labelExtents.get(candidate.text);
                if (extent === undefined) {
                  // Nothing is placed against an unmeasured word — that would
                  // be guessing at the box the whole rule turns on. The layout
                  // effect measures every word in the same commit that mounts
                  // the measuring <svg>, before the browser paints, so this is
                  // reachable only in that one pre-paint pass.
                  return [];
                }
                const at = project(candidate.point);
                const centreX = at.col / scale;
                const centreY = at.row / scale;
                const anchorX = centreX + LABEL_OFFSET_X_PX;
                const anchorY = centreY - LABEL_OFFSET_Y_PX;
                const box: LabelBox = {
                  left: anchorX + extent.dx - LABEL_CLEARANCE_PX,
                  top: anchorY + extent.dy - LABEL_CLEARANCE_PX,
                  right: anchorX + extent.dx + extent.width + LABEL_CLEARANCE_PX,
                  bottom: anchorY + extent.dy + extent.height + LABEL_CLEARANCE_PX,
                };
                // The selected station's name is drawn whatever it collides
                // with, and it still takes its space in `placed` — so it is
                // the others that give way to it, which is what selecting it
                // was for.
                if (!selectedPointIds.has(candidate.point.id)) {
                  const ownHandle: LabelBox = {
                    left: centreX - STATION_RADIUS_PX,
                    top: centreY - STATION_RADIUS_PX,
                    right: centreX + STATION_RADIUS_PX,
                    bottom: centreY + STATION_RADIUS_PX,
                  };
                  // Its OWN handle and not every handle on the map: the disc a
                  // label names is the one thing it must never sit on top of
                  // (a name over its own mark hides the mark and reads as a
                  // stray word), while the other stations' discs are the
                  // reason their labels exist at all, and dropping a name
                  // because an unrelated dot passes under it would remove
                  // information the operator can still read perfectly well.
                  if (overlaps(box, ownHandle) || placed.some((taken) => overlaps(taken, box))) {
                    return [];
                  }
                }
                placed.push(box);
                return [
                  {
                    candidate,
                    x: at.col + LABEL_OFFSET_X_PX * scale,
                    y: at.row - LABEL_OFFSET_Y_PX * scale,
                  },
                ];
              });
              return (
                <>
                  <g>
                    {drawn.edges.map((edge) => {
                      const from = pointById(drawn, edge.src);
                      const to = pointById(drawn, edge.dst);
                      if (from === undefined || to === undefined) {
                        return null;
                      }
                      const a = project(from);
                      const b = project(to);
                      const selected = selectedEdgeIds.has(edge.id);
                      const hovered = hoveredEdgeId === edge.id;
                      return (
                        <line
                          key={edge.id}
                          data-edge-id={edge.id}
                          x1={a.col}
                          y1={a.row}
                          x2={b.col}
                          y2={b.row}
                          stroke={selected ? "var(--ds-tone-warning-fg)" : "var(--ds-accent)"}
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
                      );
                    })}
                  </g>

                  {/* Coarse input has no hover, so the grammar offers its
                      insertion points permanently there and only there. */}
                  {surface.persistentGhosts.map((ghost) => {
                    const at = project(ghost.at);
                    return (
                      <EditGhostHandle
                        key={`${ghost.pathId}-${String(ghost.segmentIndex)}`}
                        x={at.col}
                        y={at.row}
                        radiusPx={GHOST_RADIUS_PX * scale}
                        state="idle"
                      />
                    );
                  })}
                  {insertionGhost === null ? null : (
                    <EditGhostHandle
                      x={project(insertionGhost.at).col}
                      y={project(insertionGhost.at).row}
                      radiusPx={GHOST_RADIUS_PX * scale}
                      state="hover"
                    />
                  )}
                  {insertPreview === null ? null : (
                    <EditGhostHandle
                      x={project(insertPreview.at).col}
                      y={project(insertPreview.at).row}
                      radiusPx={GHOST_RADIUS_PX * scale}
                      state="target"
                    />
                  )}

                  <g>
                    {drawn.points.map((point) => {
                      const at = project(point);
                      const station = point.type === STATION;
                      return (
                        // The wrapper carries the identity: `EditHandle` takes
                        // no passthrough SVG props by contract (its hidden,
                        // non-focusable boundary is the point of the
                        // fragment), so naming the drawn object is the host's
                        // job — see the file header.
                        <g
                          key={point.id}
                          data-point-id={point.id}
                          data-point-kind={station ? "station" : "path-point"}
                        >
                        <EditHandle
                          x={at.col}
                          y={at.row}
                          radiusPx={station ? stationRadius : handleRadius}
                          state={handleStateOf(point)}
                          // The world's y runs up and the raster's rows run
                          // down, so the DRAWN angle is the negative of the
                          // stored yaw. That one sign is the whole frame
                          // conversion for a direction; positions have no
                          // handedness to get wrong, which is why the
                          // projection says nothing about it.
                          {...(station ? { heading: -point.yaw } : {})}
                        />
                        </g>
                      );
                    })}
                  </g>

                  <g>
                    {labels.map((label) => (
                      <text
                        key={`label-${label.candidate.point.id}`}
                        // The drawn object's own identity, like the handles'
                        // `data-point-id`: it is what lets a reviewer and the
                        // e2e ask which names survived a given zoom.
                        data-station-label={label.candidate.point.id}
                        x={label.x}
                        y={label.y}
                        fontSize={LABEL_SIZE_PX * scale}
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
                      x={project(revealedPoint).col}
                      y={project(revealedPoint).row}
                      angle={-revealedPoint.yaw}
                      armPx={HEADING_ARM_PX * scale}
                      radiusPx={KNOB_RADIUS_PX * scale}
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
                        const landed = project(resolved.at);
                        const caught = project(snap.at);
                        return (
                          <EditSnapGuide
                            at={{ x: landed.col, y: landed.row }}
                            kind={snap.kind}
                            from={{ x: caught.col, y: caught.row }}
                            to={{ x: landed.col, y: landed.row }}
                            sizePx={SNAP_MARK_HALF_PX * scale}
                          />
                        );
                      })()}

                  {marquee === null ? null : (
                    <EditMarquee
                      from={{ x: project(marquee.from).col, y: project(marquee.from).row }}
                      to={{ x: project(marquee.to).col, y: project(marquee.to).row }}
                    />
                  )}
                </>
              );
            }}
          </MapCanvas>
        </div>

        {/* The native twin. Everything the canvas can do is reachable here,
            which is why the canvas itself takes no focus and carries no ARIA. */}
        <div style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <p style={{ ...hint, color: "var(--ds-text)" }}>
            <strong>Selected:</strong>{" "}
            {selection.targets.length === 0 ? "nothing" : selectionSummary}
            {selection.targets.length > 1
              ? ` (+${String(selection.targets.length - 1)} more)`
              : ""}
          </p>
          {notice === null ? null : (
            <p style={{ ...hint, color: "var(--ds-tone-warning-fg)" }}>{notice}</p>
          )}
          <ul style={listStyle}>
            {document.points.map((point) => {
              const chosen = selectedPointIds.has(point.id);
              return (
                <li key={point.id}>
                  <button
                    type="button"
                    style={chosen ? selectedRowStyle : rowStyle}
                    aria-pressed={chosen}
                    onClick={(event) => {
                      selectRow({ kind: "handle", id: point.id }, event.shiftKey);
                    }}
                  >
                    {point.type === STATION ? "◉" : "○"} {pointLabel(point)}
                  </button>
                </li>
              );
            })}
            {document.edges.map((edge) => {
              const chosen = selectedEdgeIds.has(edge.id);
              return (
                <li key={`edge-${edge.id}`}>
                  <button
                    type="button"
                    style={chosen ? selectedRowStyle : rowStyle}
                    aria-pressed={chosen}
                    onClick={(event) => {
                      selectRow({ kind: "path", id: edge.id }, event.shiftKey);
                    }}
                  >
                    — {edgeLabel(document, edge)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p style={hint}>
        Drag empty floor to pan · wheel to zoom about the pointer · click a
        vertex or a line to select · Shift-click to add · Shift-drag empty
        floor for a marquee · drag a selection to move it (Shift constrains to
        45°) · Alt-click a vertex to remove it · Alt-click, Alt-drag or
        double-click a line to insert a vertex on it · approach a selected
        station to reveal its heading knob and drag it to turn the station
        (Shift quantises to 15°) · Delete removes the selection, Escape clears
        it.
      </p>

      {/* What a picture cannot say. Rendered only where a host asked for it:
          the reviewed editor and the measured editor are the same program,
          and this is the one place they differ. */}
      {instrument === undefined
        ? null
        : instrument({
            points: document.points,
            edges: document.edges,
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
          })}
    </div>
  );
}
