/**
 * @file A small 2D host for the direct-manipulation grammar.
 *
 * This is deliberately a demo editor rather than a second editing kernel. The
 * session owns the committed document, the grammar/hook own pointer meaning,
 * and this component only translates intents into this demo's document shape
 * and paints the returned geometry in an SVG whose world units are pixels.
 *
 * It is also the browser-proof harness, so it carries two things a product host
 * would carry too, and one it would not:
 *
 *  - TWO routes. "A press near an unselected path does not grow a vertex"
 *    (invariant F') can only be proved against a second, unarmed route while
 *    the first one is armed. One document cannot show the contrast.
 *  - The chrome a pointer-only operator needs: finish, magnet, add-to-selection,
 *    delete-selection. These are the native twins the grammar defers to, and
 *    `pointer-only-completeness` drives the whole vocabulary through them
 *    without sending a single key event.
 *  - Readouts (`dm-*`) for state a screenshot cannot show: the modifiers in
 *    force, the snap that fired, the marquee's candidate count, the pending
 *    placement, the run's length, the selection's size and primary.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EditGhostHandle,
  EditHandle,
  EditHeadingKnob,
  EditMarquee,
  EditRemoveBadge,
  EditRubberBand,
  EditSnapGuide,
} from "../src/index";
import {
  BADGE_ANCHOR_OFFSET_SCALE,
  BADGE_RADIUS_PX,
  EMPTY_SELECTION,
  HANDLE_RADIUS_PX,
  KNOB_RADIUS_PX,
  GHOST_PICK_RADIUS_PX,
  REVEAL_RADIUS_PX,
  SNAP_RADIUS_PX,
  areaBadgeAnchor,
  beginSession,
  commitEdit,
  handleBadgeAnchor,
  headingKnobAt,
  insertVertexOnEdge,
  moveVertex,
  pruneSelection,
  redoEdit,
  sameTarget,
  selectTargets,
  undoEdit,
  useDirectEditSurface,
  useEditCommandKeys,
} from "../src/direct-manipulation";
import type {
  DragPreview,
  EditAffordance,
  EditArming,
  EditGrid,
  EditIntent,
  EditMove,
  EditScene,
  EditSelection,
  EditSession,
  EditSnapping,
  EditTarget,
  EditTolerances,
  EditMode,
  Vertex,
} from "../src/direct-manipulation";

const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const PATH_ID = "path";
const SECOND_PATH_ID = "path-2";
const AREA_ID = "ring";
const HEADING_ARM_PX = 24;
const GRID_PITCH_PX = 25;

type DemoPoint = Vertex & {
  readonly id: string;
  readonly yaw?: number;
};

type DemoDocument = {
  /** The first route, armed by the scenes that edit it. */
  readonly points: readonly DemoPoint[];
  /** The second route, left unarmed so invariant F' has something to prove. */
  readonly second: readonly DemoPoint[];
  readonly ring: readonly Vertex[];
};

const SEED_DOCUMENT: DemoDocument = {
  points: [
    { id: "p0", x: 80, y: 90 },
    { id: "p1", x: 200, y: 120, yaw: 0 },
    { id: "p2", x: 330, y: 90 },
    { id: "p3", x: 470, y: 150 },
  ],
  second: [
    { id: "q0", x: 360, y: 200 },
    { id: "q1", x: 560, y: 200 },
  ],
  ring: [
    { x: 110, y: 250 },
    { x: 270, y: 250 },
    { x: 190, y: 360 },
  ],
};

const TOLERANCE: EditTolerances = {
  handleM: HANDLE_RADIUS_PX,
  ghostM: GHOST_PICK_RADIUS_PX,
  knobM: KNOB_RADIUS_PX,
  badgeM: BADGE_RADIUS_PX,
  headingArmM: HEADING_ARM_PX,
  revealM: REVEAL_RADIUS_PX,
  snapM: SNAP_RADIUS_PX,
};

const DEMO_GRID: EditGrid = { pitchM: GRID_PITCH_PX, origin: { x: 0, y: 0 } };

/** Which route is being extended, and from which end. */
type ActiveRun = {
  readonly pathId: string;
  readonly endpoint: "head" | "tail";
  readonly placed: number;
};

function pointString(points: readonly Vertex[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function ringReadout(ring: readonly Vertex[]): string {
  return ring.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" | ");
}

function targetKey(target: EditTarget): string {
  if (target.kind === "vertex") {
    return `vertex:${target.areaId}:${target.index}`;
  }
  return `${target.kind}:${target.id}`;
}

function pathOf(document: DemoDocument, pathId: string): readonly DemoPoint[] {
  return pathId === SECOND_PATH_ID ? document.second : document.points;
}

function withPath(
  document: DemoDocument,
  pathId: string,
  points: readonly DemoPoint[],
): DemoDocument {
  return pathId === SECOND_PATH_ID
    ? { ...document, second: points }
    : { ...document, points };
}

function movePoint(points: readonly DemoPoint[], id: string, at: Vertex): readonly DemoPoint[] {
  return points.map((point) => (point.id === id ? { ...point, ...at } : point));
}

/** Apply one gesture's whole move set: one document, one undo step. */
function applyMoves(document: DemoDocument, moves: readonly EditMove[]): DemoDocument {
  return moves.reduce<DemoDocument>((current, move) => {
    if (move.target.kind === "handle") {
      return {
        ...current,
        points: movePoint(current.points, move.target.id, move.at),
        second: movePoint(current.second, move.target.id, move.at),
      };
    }
    if (move.target.kind === "vertex") {
      return { ...current, ring: moveVertex(current.ring, move.target.index, move.at) };
    }
    return current;
  }, document);
}

/** Remove every named target, ring vertices highest-index-first. */
function removeTargets(
  document: DemoDocument,
  targets: readonly EditTarget[],
): DemoDocument {
  const handleIds = targets.flatMap((target) => (target.kind === "handle" ? [target.id] : []));
  const vertexIndexes = targets
    .flatMap((target) => (target.kind === "vertex" ? [target.index] : []))
    .sort((left, right) => right - left);
  const dropsArea = targets.some((target) => target.kind === "area");
  const withoutHandles: DemoDocument = {
    ...document,
    points: document.points.filter((point) => !handleIds.includes(point.id)),
    second: document.second.filter((point) => !handleIds.includes(point.id)),
  };
  if (dropsArea) {
    return { ...withoutHandles, ring: [] };
  }
  return {
    ...withoutHandles,
    ring: vertexIndexes.reduce<readonly Vertex[]>(
      (ring, index) => ring.filter((_vertex, at) => at !== index),
      document.ring,
    ),
  };
}

function previewDocument(document: DemoDocument, drag: DragPreview): DemoDocument {
  if (drag.kind === "move-set") {
    return applyMoves(document, drag.moves);
  }
  if (drag.kind === "rotate") {
    return {
      ...document,
      points: document.points.map((point) =>
        point.id === drag.id ? { ...point, yaw: drag.yaw } : point,
      ),
    };
  }
  if (drag.kind === "insert") {
    const points = pathOf(document, drag.pathId);
    const inserted: DemoPoint = {
      id: `preview-${drag.pathId}-${drag.afterIndex}`,
      ...drag.at,
    };
    return withPath(document, drag.pathId, [
      ...points.slice(0, drag.afterIndex + 1),
      inserted,
      ...points.slice(drag.afterIndex + 1),
    ]);
  }
  if (drag.kind === "insert-vertex") {
    return { ...document, ring: insertVertexOnEdge(document.ring, drag.edgeIndex, drag.at) };
  }
  return document;
}

type GlyphState = "idle" | "hover" | "selected" | "primary" | "dragging";

function stateForTarget(
  target: EditTarget,
  affordance: EditAffordance,
  selection: EditSelection,
  dragging: boolean,
): GlyphState {
  if (dragging) {
    return "dragging";
  }
  if (selection.primary !== null && sameTarget(selection.primary, target)) {
    return "primary";
  }
  if (selection.targets.some((candidate) => sameTarget(candidate, target))) {
    return "selected";
  }
  if (
    (affordance.kind === "handle" && target.kind === "handle" && affordance.id === target.id) ||
    (affordance.kind === "vertex" &&
      target.kind === "vertex" &&
      affordance.index === target.index)
  ) {
    return "hover";
  }
  return "idle";
}

/** A self-contained 600x400 SVG editor used by the demo and browser proof. */
export function DirectManipulationDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointSequence = useRef(4);
  const [mode, setMode] = useState<EditMode>("direct");
  const [arming, setArming] = useState<EditArming>("sustained");
  const [selection, setSelection] = useState<EditSelection>(EMPTY_SELECTION);
  const [drawing, setDrawing] = useState<readonly Vertex[] | null>(null);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [session, setSession] = useState<EditSession<DemoDocument>>(() =>
    beginSession(SEED_DOCUMENT),
  );
  const [cameraLocked, setCameraLocked] = useState(false);
  const [status, setStatus] = useState("ready");
  const [magnet, setMagnet] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [gridDeclared, setGridDeclared] = useState(true);
  const [stickyAdd, setStickyAdd] = useState(false);
  const [hovered, setHovered] = useState(false);

  const createPoint = useCallback((at: Vertex): DemoPoint => {
    const sequence = pointSequence.current;
    pointSequence.current += 1;
    return { id: `p${sequence}`, ...at };
  }, []);

  const committedDocument = session.current;

  const toWorld = useCallback((clientX: number, clientY: number): Vertex | null => {
    const svg = svgRef.current;
    if (svg === null) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const commitDocument = useCallback((next: DemoDocument) => {
    setSession((current) => commitEdit(current, next));
  }, []);

  /** Extend one route from one of its ends and keep the run's tail in sync. */
  const placeOnRun = useCallback(
    (at: Vertex) => {
      const active: ActiveRun = run ?? { pathId: PATH_ID, endpoint: "tail", placed: 0 };
      const placedPoint = createPoint(at);
      const points = pathOf(session.current, active.pathId);
      const next =
        active.endpoint === "head" ? [placedPoint, ...points] : [...points, placedPoint];
      commitDocument(withPath(session.current, active.pathId, next));
      setRun({ ...active, placed: active.placed + 1 });
      setDrawing([at]);
    },
    [commitDocument, createPoint, run, session],
  );

  const finishRun = useCallback(() => {
    setRun(null);
    setDrawing(null);
    setMode("direct");
  }, []);

  const handleIntent = useCallback(
    (intent: EditIntent) => {
      setStatus(intent.kind);
      switch (intent.kind) {
        case "select-set":
          setSelection((current) =>
            selectTargets(current, intent.targets, intent.additive || stickyAdd),
          );
          return;
        case "deselect":
          setSelection(EMPTY_SELECTION);
          return;
        case "nothing":
          return;
        case "refused":
          setStatus(`refused: ${intent.reason}`);
          return;
        case "move-set":
          commitDocument(applyMoves(session.current, intent.moves));
          return;
        case "delete-set": {
          const next = removeTargets(session.current, intent.targets);
          commitDocument(next);
          setSelection((current) =>
            pruneSelection(
              {
                targets: current.targets.filter(
                  (target) =>
                    !intent.targets.some((removed) => sameTarget(removed, target)),
                ),
                primary: current.primary,
              },
              sceneOf(next),
            ),
          );
          return;
        }
        case "rotate":
          commitDocument({
            ...session.current,
            points: session.current.points.map((point) =>
              point.id === intent.id ? { ...point, yaw: intent.yaw } : point,
            ),
          });
          return;
        case "insert": {
          const points = pathOf(session.current, intent.pathId);
          const afterIndex = Math.min(Math.max(intent.afterIndex, -1), points.length - 1);
          commitDocument(
            withPath(session.current, intent.pathId, [
              ...points.slice(0, afterIndex + 1),
              createPoint(intent.at),
              ...points.slice(afterIndex + 1),
            ]),
          );
          return;
        }
        case "insert-vertex":
          commitDocument({
            ...session.current,
            ring: insertVertexOnEdge(session.current.ring, intent.edgeIndex, intent.at),
          });
          return;
        case "place":
          placeOnRun(intent.at);
          return;
        case "draw": {
          const nextDrawing = [...(drawing ?? []), intent.at];
          setDrawing(nextDrawing);
          commitDocument({ ...session.current, ring: nextDrawing });
          return;
        }
        case "close-ring":
          if (drawing !== null && drawing.length >= 3) {
            commitDocument({ ...session.current, ring: [...drawing] });
            setDrawing(null);
            setRun(null);
            setMode("direct");
            setSelection(EMPTY_SELECTION);
          }
          return;
        case "finish-run":
          finishRun();
          return;
        case "cancel-run":
          // The run is abandoned, the mode is NOT: Escape peels one layer.
          setDrawing(null);
          setRun(null);
          return;
        case "resume-drawing": {
          const points = pathOf(session.current, intent.pathId);
          const end = intent.endpoint === "head" ? points[0] : points[points.length - 1];
          setRun({ pathId: intent.pathId, endpoint: intent.endpoint, placed: 0 });
          setDrawing(end === undefined ? null : [end]);
          return;
        }
      }
    },
    [
      commitDocument,
      createPoint,
      drawing,
      finishRun,
      placeOnRun,
      session,
      stickyAdd,
    ],
  );

  const scene = useMemo<EditScene>(() => sceneOf(committedDocument), [committedDocument]);

  const snapping = useMemo<EditSnapping>(
    () => ({ enabled: magnet, toGeometry: true, toGrid: gridOn }),
    [gridOn, magnet],
  );

  const surface = useDirectEditSurface({
    mode,
    arming,
    scene,
    selection,
    capabilities: { areas: { supported: true } },
    tolerance: TOLERANCE,
    drawing: drawing !== null && drawing.length > 0 ? drawing : null,
    snapping,
    grid: gridDeclared ? DEMO_GRID : null,
    toWorld,
    onIntent: handleIntent,
    onCameraLock: setCameraLocked,
    onModeExhausted: () => setMode("direct"),
    onRefused: (reason) => setStatus(`refused: ${reason}`),
  });

  /**
   * The document commands live here, in the chrome, exactly as they do in the
   * consuming hosts - never on the canvas. `enabled` follows the pointer's
   * residence because this page mounts three of these editors side by side and
   * a key belongs to the one the operator is working in.
   */
  useEditCommandKeys({
    enabled: hovered,
    armed: mode !== "direct",
    runLength: drawing?.length ?? 0,
    hasSelection: selection.targets.length > 0,
    onFinishRun: () => {
      setStatus("finish-run");
      finishRun();
    },
    onCancelRun: () => {
      setStatus("cancel-run");
      setDrawing(null);
      setRun(null);
    },
    onDisarm: () => {
      setStatus("disarm");
      setMode("direct");
    },
    onDeselectAll: () => {
      setStatus("deselect");
      setSelection(EMPTY_SELECTION);
    },
    onDeleteSelection: () => {
      setStatus("delete-set");
      handleIntent({ kind: "delete-set", targets: selection.targets });
    },
  });

  const surfaceDrag = surface.drag;
  const renderedDocument = useMemo(
    () =>
      surfaceDrag === null
        ? committedDocument
        : previewDocument(committedDocument, surfaceDrag),
    [committedDocument, surfaceDrag],
  );
  const renderedRing = renderedDocument.ring;
  const primary = selection.primary;
  const primaryHandle =
    primary !== null && primary.kind === "handle"
      ? [...renderedDocument.points, ...renderedDocument.second].find(
          (point) => point.id === primary.id,
        ) ?? null
      : null;
  const areaSelected = selection.targets.some(
    (target) => target.kind === "area" && target.id === AREA_ID,
  );
  const headingAnchor =
    primaryHandle === null ? null : headingKnobAt(primaryHandle, HEADING_ARM_PX);
  const knobVisible = surface.affordance.kind === "knob" || surfaceDrag?.kind === "rotate";
  const badgesVisible = surface.modality === "coarse";

  const selectAppendMode = useCallback(() => {
    setMode((current) => (current === "append" ? "direct" : "append"));
    setDrawing(null);
    setRun(null);
  }, []);

  const selectDrawMode = useCallback(() => {
    setMode((current) => (current === "draw-area" ? "direct" : "draw-area"));
    setDrawing((current) => current ?? []);
    setRun(null);
    setSelection(EMPTY_SELECTION);
  }, []);

  const displayedRing =
    mode === "draw-area" && drawing !== null && drawing.length > 0 ? drawing : renderedRing;
  const dynamicGhost =
    surface.affordance.kind === "ghost" || surface.affordance.kind === "ghost-vertex"
      ? surface.affordance
      : null;
  const highlightedEdge =
    surface.affordance.kind === "path-edge" || surface.affordance.kind === "ring-edge"
      ? surface.affordance
      : null;
  const edgePoints = highlightedEdgePoints(highlightedEdge, renderedDocument);
  const activeSnap = surface.dragFeedback?.resolved.snap ?? surface.pending?.resolved.snap ?? null;
  const marquee = surface.marquee;
  const pending = surface.pending;

  return (
    <Card>
      <CardHeader
        title="Direct manipulation editor (v0.17)"
        hint="SVG proof: drag to edit, click to select, Shift constrains, Alt adds or removes"
      />
      <div style={{ display: "grid", gap: "var(--ds-space-lg)", minWidth: 0 }}>
        <div
          data-testid="dm-toolbar"
          style={{ display: "flex", gap: "var(--ds-space-sm)", flexWrap: "wrap", alignItems: "center" }}
        >
          <Button
            size="sm"
            data-testid="dm-mode-append"
            data-mode="append"
            aria-pressed={mode === "append"}
            onClick={selectAppendMode}
          >
            Append point
          </Button>
          <Button
            size="sm"
            data-testid="dm-mode-draw-area"
            data-mode="draw-area"
            aria-pressed={mode === "draw-area"}
            onClick={selectDrawMode}
          >
            Draw area
          </Button>
          {mode === "direct" ? null : (
            <Button
              size="sm"
              data-testid="dm-finish"
              onClick={() => {
                setStatus("finish-run");
                finishRun();
              }}
            >
              Finish
            </Button>
          )}
          <Button
            size="sm"
            data-testid="dm-snap-toggle"
            aria-pressed={magnet}
            onClick={() => setMagnet((current) => !current)}
          >
            Magnet
          </Button>
          <Button
            size="sm"
            data-testid="dm-grid-toggle"
            aria-pressed={gridOn}
            onClick={() => setGridOn((current) => !current)}
          >
            Snap to grid
          </Button>
          <Button
            size="sm"
            data-testid="dm-grid-declared-toggle"
            aria-pressed={gridDeclared}
            onClick={() => setGridDeclared((current) => !current)}
          >
            Declare grid
          </Button>
          <Button
            size="sm"
            data-testid="dm-sticky-add"
            aria-pressed={stickyAdd}
            onClick={() => setStickyAdd((current) => !current)}
          >
            Add to selection
          </Button>
          <Button
            size="sm"
            data-testid="dm-arming-toggle"
            aria-pressed={arming === "sustained"}
            onClick={() =>
              setArming((current) => (current === "sustained" ? "one-shot" : "sustained"))
            }
          >
            Sustained
          </Button>
          <Button
            size="sm"
            data-testid="dm-delete-selection"
            disabled={selection.targets.length === 0}
            onClick={() => {
              setStatus("delete-set");
              handleIntent({ kind: "delete-set", targets: selection.targets });
            }}
          >
            Delete selection
          </Button>
          <Button
            size="sm"
            data-testid="dm-undo"
            disabled={!session.past.length}
            onClick={() => setSession((current) => undoEdit(current))}
          >
            Undo
          </Button>
          <Button
            size="sm"
            data-testid="dm-redo"
            disabled={!session.future.length}
            onClick={() => setSession((current) => redoEdit(current))}
          >
            Redo
          </Button>
          <span
            data-testid="dm-mode"
            data-mode={mode}
            style={{ color: "var(--ds-text-muted)", fontSize: "var(--ds-font-size-label)" }}
          >
            mode: {mode}
          </span>
        </div>

        <div
          data-testid="dm-surface"
          data-mode={mode}
          {...surface.surfaceProps}
          onPointerEnter={(event) => {
            setHovered(true);
            surface.surfaceProps.onPointerEnter(event);
          }}
          onPointerLeave={(event) => {
            setHovered(false);
            surface.surfaceProps.onPointerLeave(event);
          }}
          style={{
            ...surface.surfaceProps.style,
            width: `${SVG_WIDTH}px`,
            maxWidth: "100%",
            touchAction: "none",
            overflow: "hidden",
            borderRadius: "var(--ds-radius-control)",
          }}
        >
          <svg
            ref={svgRef}
            data-testid="dm-svg"
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{ display: "block", background: "var(--ds-surface-inset)" }}
          >
            <rect
              x="0"
              y="0"
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill="var(--ds-surface-inset)"
            />
            {renderedRing.length >= 3 ? (
              <polygon
                data-testid="dm-ring"
                points={pointString(renderedRing)}
                fill={areaSelected ? "var(--ds-accent-soft)" : "var(--ds-surface)"}
                stroke="var(--ds-accent)"
                strokeWidth="2"
              />
            ) : renderedRing.length > 0 ? (
              <polyline
                data-testid="dm-ring"
                points={pointString(renderedRing)}
                fill="none"
                stroke="var(--ds-accent)"
                strokeWidth="2"
              />
            ) : null}
            <polyline
              data-testid="dm-path"
              points={pointString(renderedDocument.points)}
              fill="none"
              stroke="var(--ds-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              data-testid="dm-path-2"
              points={pointString(renderedDocument.second)}
              fill="none"
              stroke="var(--ds-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {edgePoints === null ? null : (
              <line
                data-testid="dm-edge-highlight"
                x1={edgePoints.a.x}
                y1={edgePoints.a.y}
                x2={edgePoints.b.x}
                y2={edgePoints.b.y}
                stroke="var(--ds-accent-hover)"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.5"
              />
            )}

            {surface.persistentGhosts.map((ghost) => (
              <g
                key={`persistent-${ghost.pathId}-${ghost.segmentIndex}`}
                data-testid="dm-persistent-ghost"
              >
                <EditGhostHandle x={ghost.at.x} y={ghost.at.y} state="idle" />
              </g>
            ))}
            {dynamicGhost === null ? null : (
              <g
                data-testid={
                  dynamicGhost.kind === "ghost" ? "dm-ghost" : "dm-ghost-vertex"
                }
              >
                <EditGhostHandle
                  x={dynamicGhost.at.x}
                  y={dynamicGhost.at.y}
                  state={surfaceDrag?.kind === "insert" || surfaceDrag?.kind === "insert-vertex" ? "target" : "hover"}
                />
              </g>
            )}

            {marquee === null ? null : (
              <g data-testid="dm-marquee">
                <EditMarquee from={marquee.from} to={marquee.to} />
              </g>
            )}
            {pending === null ? null : (
              <g data-testid="dm-rubber-band">
                <EditRubberBand
                  from={pending.from}
                  to={pending.to}
                  state={pending.resolved.constrained ? "constrained" : "free"}
                  {...(mode === "draw-area" && (drawing?.length ?? 0) >= 2 && drawing?.[0] !== undefined
                    ? { closeTo: drawing[0] }
                    : {})}
                />
              </g>
            )}
            {activeSnap === null ? null : (
              <g data-testid="dm-snap-guide" data-snap-kind={activeSnap.kind}>
                <EditSnapGuide
                  at={activeSnap.at}
                  kind={activeSnap.kind}
                  {...(activeSnap.kind === "vertex" || activeSnap.kind === "align"
                    ? { from: activeSnap.at, to: snapPartner(activeSnap, renderedDocument) }
                    : {})}
                />
              </g>
            )}

            {[...renderedDocument.points, ...renderedDocument.second].map((point) => (
              <g
                key={point.id}
                data-testid={`dm-handle-${point.id}`}
                data-point-id={point.id}
                data-x={point.x}
                data-y={point.y}
              >
                <EditHandle
                  x={point.x}
                  y={point.y}
                  state={stateForTarget(
                    { kind: "handle", id: point.id },
                    surface.affordance,
                    selection,
                    surfaceDrag?.kind === "move-set" &&
                      surfaceDrag.moves.some(
                        (move) => move.target.kind === "handle" && move.target.id === point.id,
                      ),
                  )}
                  heading={point.yaw}
                />
              </g>
            ))}

            {displayedRing.map((point, index) => (
              <g
                key={`ring-vertex-${index}`}
                data-testid={`dm-ring-vertex-${index}`}
                data-x={point.x}
                data-y={point.y}
              >
                <EditHandle
                  x={point.x}
                  y={point.y}
                  state={stateForTarget(
                    { kind: "vertex", areaId: AREA_ID, index },
                    surface.affordance,
                    areaSelected
                      ? {
                          targets: [...selection.targets, { kind: "vertex", areaId: AREA_ID, index }],
                          primary: selection.primary,
                        }
                      : selection,
                    surfaceDrag?.kind === "move-set" &&
                      surfaceDrag.moves.some(
                        (move) => move.target.kind === "vertex" && move.target.index === index,
                      ),
                  )}
                />
              </g>
            ))}

            {headingAnchor === null || primaryHandle === null || !knobVisible ? null : (
              <g
                data-testid="dm-heading-knob"
                data-x={headingAnchor.x}
                data-y={headingAnchor.y}
                data-angle={primaryHandle.yaw ?? 0}
              >
                <EditHeadingKnob
                  x={primaryHandle.x}
                  y={primaryHandle.y}
                  angle={primaryHandle.yaw ?? 0}
                  armPx={HEADING_ARM_PX}
                  state={
                    surfaceDrag?.kind === "rotate"
                      ? "dragging"
                      : surface.affordance.kind === "knob"
                        ? "hover"
                        : "idle"
                  }
                />
              </g>
            )}

            {badgesVisible && primaryHandle !== null ? (
              <g
                data-testid="dm-remove-badge"
                data-x={handleBadgeAnchor(primaryHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                data-y={handleBadgeAnchor(primaryHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
              >
                <EditRemoveBadge
                  x={handleBadgeAnchor(primaryHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                  y={handleBadgeAnchor(primaryHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
                  offsetPx={{ x: 0, y: 0 }}
                  state="idle"
                />
              </g>
            ) : null}

            {badgesVisible && areaSelected && renderedRing.length > 0 ? (
              <>
                <g
                  data-testid="dm-remove-badge"
                  data-badge-target="area"
                  data-x={areaBadgeAnchor(renderedRing, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                  data-y={areaBadgeAnchor(renderedRing, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
                >
                  <EditRemoveBadge
                    x={areaBadgeAnchor(renderedRing, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                    y={areaBadgeAnchor(renderedRing, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
                    offsetPx={{ x: 0, y: 0 }}
                    state="idle"
                  />
                </g>
                {renderedRing.map((point, index) => {
                  const anchor = handleBadgeAnchor(point, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX);
                  return (
                    <g
                      key={`ring-badge-${index}`}
                      data-testid={`dm-ring-remove-badge-${index}`}
                      data-x={anchor.x}
                      data-y={anchor.y}
                    >
                      <EditRemoveBadge
                        x={anchor.x}
                        y={anchor.y}
                        offsetPx={{ x: 0, y: 0 }}
                        state="idle"
                      />
                    </g>
                  );
                })}
              </>
            ) : null}
          </svg>
        </div>

        <div
          style={{
            display: "grid",
            gap: "var(--ds-space-xs)",
            color: "var(--ds-text-muted)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: "var(--ds-font-size-label)",
            overflowWrap: "anywhere",
          }}
        >
          <span>
            path points: <span data-testid="dm-point-count">{session.current.points.length}</span>
          </span>
          <span>
            second path points:{" "}
            <span data-testid="dm-second-count">{session.current.second.length}</span>
          </span>
          <span>
            ring vertices: <span data-testid="dm-ring-count">{session.current.ring.length}</span>
          </span>
          <span data-testid="dm-path-readout">
            document path: {session.current.points.map((point) => (
              <span
                key={point.id}
                data-testid="dm-session-point"
                data-point-id={point.id}
                data-x={point.x}
                data-y={point.y}
              >
                {point.id}:{point.x.toFixed(1)},{point.y.toFixed(1)}{" "}
              </span>
            ))}
          </span>
          <span data-testid="dm-second-readout">
            second path: {session.current.second.map((point) => (
              <span
                key={point.id}
                data-testid="dm-second-point"
                data-point-id={point.id}
                data-x={point.x}
                data-y={point.y}
              >
                {point.id}:{point.x.toFixed(1)},{point.y.toFixed(1)}{" "}
              </span>
            ))}
          </span>
          <span data-testid="dm-ring-readout">document ring: {ringReadout(session.current.ring)}</span>
          <span data-testid="dm-yaw-readout">
            yaw: {primaryHandle?.yaw === undefined ? "none" : primaryHandle.yaw.toFixed(3)}
          </span>
          <span data-testid="dm-selection">
            selection: {selection.targets.length === 0
              ? "none"
              : selection.targets.map(targetKey).join(",")}
          </span>
          <span data-testid="dm-selection-count">selected: {selection.targets.length}</span>
          <span data-testid="dm-primary">primary: {primary === null ? "none" : targetKey(primary)}</span>
          <span data-testid="dm-modifiers">
            modifiers: shift={surface.modifiers.shift ? "on" : "off"} alt=
            {surface.modifiers.alt ? "on" : "off"}
          </span>
          <span data-testid="dm-modality">modality: {surface.modality}</span>
          <span data-testid="dm-affordance">affordance: {surface.affordance.kind}</span>
          <span data-testid="dm-cursor">cursor: {surface.cursor.name}</span>
          <span data-testid="dm-snap-readout">snap: {activeSnap === null ? "none" : activeSnap.kind}</span>
          <span data-testid="dm-marquee-readout">
            marquee: {marquee === null
              ? "none"
              : marquee.refusal !== null
                ? `refused: ${marquee.refusal}`
                : `${marquee.candidates.length} candidates`}
          </span>
          <span data-testid="dm-pending">
            pending: {pending === null
              ? "none"
              : `${pending.to.x.toFixed(1)},${pending.to.y.toFixed(1)}${
                  pending.resolved.constrained ? " constrained" : ""
                }`}
          </span>
          <span data-testid="dm-run-length">run: {run === null ? 0 : run.placed}</span>
          <span data-testid="dm-arming">arming: {arming}</span>
          <span data-testid="dm-grid-declared">grid: {gridDeclared ? "declared" : "none"}</span>
          <span data-testid="dm-undo-count">undo steps: {session.past.length}</span>
          <span data-testid="dm-camera-lock">camera: {cameraLocked ? "locked" : "free"}</span>
          <span data-testid="dm-status">last intent: {status}</span>
        </div>
      </div>
    </Card>
  );
}

function sceneOf(document: DemoDocument): EditScene {
  return {
    handles: [...document.points, ...document.second].map(({ id, x, y, yaw }) => ({
      id,
      x,
      y,
      yaw,
    })),
    paths: [
      { id: PATH_ID, handleIds: document.points.map((point) => point.id) },
      { id: SECOND_PATH_ID, handleIds: document.second.map((point) => point.id) },
    ],
    areas: document.ring.length === 0 ? [] : [{ id: AREA_ID, ring: document.ring }],
  };
}

/** The two ends of the highlighted edge, for the hover highlight. */
function highlightedEdgePoints(
  affordance: EditAffordance | null,
  document: DemoDocument,
): { readonly a: Vertex; readonly b: Vertex } | null {
  if (affordance === null) {
    return null;
  }
  if (affordance.kind === "path-edge") {
    const points = pathOf(document, affordance.pathId);
    const a = points[affordance.segmentIndex];
    const b = points[affordance.segmentIndex + 1];
    return a === undefined || b === undefined ? null : { a, b };
  }
  if (affordance.kind === "ring-edge") {
    const ring = document.ring;
    const a = ring[affordance.edgeIndex];
    const b = ring[(affordance.edgeIndex + 1) % Math.max(ring.length, 1)];
    return a === undefined || b === undefined ? null : { a, b };
  }
  return null;
}

/** The point a vertex or alignment snap caught, for the guide line. */
function snapPartner(
  snap: { readonly kind: string; readonly at: Vertex },
  document: DemoDocument,
): Vertex {
  const candidates = [...document.points, ...document.second, ...document.ring];
  const nearest = candidates
    .map((candidate) => ({
      at: { x: candidate.x, y: candidate.y },
      distance: Math.hypot(candidate.x - snap.at.x, candidate.y - snap.at.y),
    }))
    .sort((left, right) => left.distance - right.distance)[0];
  return nearest?.at ?? snap.at;
}
