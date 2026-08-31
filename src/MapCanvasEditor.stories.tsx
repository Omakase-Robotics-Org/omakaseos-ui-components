/**
 * @file The PRACTICAL map editor story: the real `cuc_1_north` occupancy
 * raster, the real 22-vertex / 22-edge road graph exported from the same d1
 * AMR, and the whole direct-manipulation grammar composed onto `<MapCanvas/>`
 * through its public API only.
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
 * ## The native twin
 *
 * The canvas is a picture with decorative SVG over it: it takes no focus and
 * carries no ARIA. Everything it can do is also reachable from the list and
 * the buttons beside it — select a row, read what is selected, delete it,
 * undo. That is the contract this suite's editing surfaces hold to, and it is
 * why the SVG needs no keyboard behaviour of its own.
 */
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react";
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

type EditorPoint = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Radians, world frame, x east and counter-clockwise positive. */
  readonly yaw: number;
  readonly type: CucRoadPointType;
  readonly defineType?: string;
};

type EditorEdge = {
  readonly id: string;
  readonly src: string;
  readonly dst: string;
};

type EditorDocument = {
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
  border: "1px solid transparent",
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

/** The whole editor: canvas, overlay, and the native twin beside it. */
function MapCanvasEditorPreview() {
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
          gridTemplateColumns: "minmax(0, 1fr) 260px",
          gap: "var(--ds-space-md)",
          alignItems: "start",
        }}
      >
        <div style={{ height: "520px" }}>
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
              const stationRadius = handleRadius * 1.25;
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
                        <EditHandle
                          key={point.id}
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
                      );
                    })}
                  </g>

                  <g>
                    {drawn.points.map((point) =>
                      point.type !== STATION || point.defineType === undefined ? null : (
                        <text
                          key={`label-${point.id}`}
                          x={project(point).col + stationRadius * 1.6}
                          y={project(point).row - stationRadius * 1.2}
                          fontSize={LABEL_SIZE_PX * scale}
                          fontFamily="var(--ds-font-sans)"
                          fill="var(--ds-text)"
                          stroke="var(--ds-surface)"
                          strokeWidth={LABEL_HALO_PX * scale}
                          paintOrder="stroke"
                        >
                          {point.defineType}
                        </text>
                      ),
                    )}
                  </g>

                  {revealed === null || revealedPoint === undefined ? null : (
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
    </div>
  );
}

const meta = {
  title: "MapCanvas/Editor",
  component: MapCanvasEditorPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof MapCanvasEditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
