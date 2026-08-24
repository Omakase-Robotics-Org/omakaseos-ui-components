/**
 * @file A small 2D host for the direct-manipulation grammar.
 *
 * This is deliberately a demo editor rather than a second editing kernel. The
 * session owns the committed document, the grammar/hook own pointer meaning,
 * and this component only translates intents into this demo's document shape
 * and paints the returned geometry in an SVG whose world units are pixels.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EditGhostHandle,
  EditHandle,
  EditHeadingKnob,
  EditRemoveBadge,
} from "../src/index";
import {
  BADGE_ANCHOR_OFFSET_SCALE,
  BADGE_RADIUS_PX,
  HANDLE_RADIUS_PX,
  KNOB_RADIUS_PX,
  GHOST_PICK_RADIUS_PX,
  areaBadgeAnchor,
  beginSession,
  commitEdit,
  handleBadgeAnchor,
  headingKnobAt,
  insertVertexOnEdge,
  moveVertex,
  redoEdit,
  undoEdit,
  useDirectEditSurface,
} from "../src/direct-manipulation";
import type {
  DragPreview,
  EditAffordance,
  EditIntent,
  EditScene,
  EditSelection,
  EditSession,
  EditTolerances,
  EditMode,
  Vertex,
} from "../src/direct-manipulation";

const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const PATH_ID = "path";
const AREA_ID = "ring";
const HEADING_ARM_PX = 24;

type DemoPoint = Vertex & {
  readonly id: string;
  readonly yaw?: number;
};

type DemoDocument = {
  readonly points: readonly DemoPoint[];
  readonly ring: readonly Vertex[];
};

const SEED_DOCUMENT: DemoDocument = {
  points: [
    { id: "p0", x: 80, y: 90 },
    { id: "p1", x: 200, y: 120, yaw: 0 },
    { id: "p2", x: 330, y: 90 },
    { id: "p3", x: 470, y: 150 },
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
};

function pointString(points: readonly Vertex[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function ringReadout(ring: readonly Vertex[]): string {
  return ring.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" | ");
}

function updatePoint(points: readonly DemoPoint[], id: string, at: Vertex): readonly DemoPoint[] {
  return points.map((point) => (point.id === id ? { ...point, ...at } : point));
}

function previewDocument(document: DemoDocument, drag: DragPreview): DemoDocument {
  if (drag.kind === "move") {
    return { ...document, points: updatePoint(document.points, drag.id, drag.at) };
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
    const inserted: DemoPoint = {
      id: `preview-${drag.pathId}-${drag.afterIndex}`,
      ...drag.at,
    };
    return {
      ...document,
      points: [
        ...document.points.slice(0, drag.afterIndex + 1),
        inserted,
        ...document.points.slice(drag.afterIndex + 1),
      ],
    };
  }
  if (drag.kind === "move-vertex") {
    return { ...document, ring: moveVertex(document.ring, drag.index, drag.at) };
  }
  return {
    ...document,
    ring: insertVertexOnEdge(document.ring, drag.edgeIndex, drag.at),
  };
}

function stateForPathPoint(
  point: DemoPoint,
  affordance: EditAffordance,
  selection: EditSelection,
  drag: DragPreview | null,
): "idle" | "hover" | "selected" | "dragging" {
  if (
    (drag?.kind === "move" || drag?.kind === "rotate") &&
    drag.id === point.id
  ) {
    return "dragging";
  }
  if (
    drag?.kind === "insert" &&
    point.id === `preview-${drag.pathId}-${drag.afterIndex}`
  ) {
    return "dragging";
  }
  if (selection?.kind === "handle" && selection.id === point.id) {
    return "selected";
  }
  if (affordance.kind === "handle" && affordance.id === point.id) {
    return "hover";
  }
  return "idle";
}

function stateForRingVertex(
  index: number,
  affordance: EditAffordance,
  selection: EditSelection,
  drag: DragPreview | null,
): "idle" | "hover" | "selected" | "dragging" {
  if (drag?.kind === "move-vertex" && drag.index === index) {
    return "dragging";
  }
  if (drag?.kind === "insert-vertex" && drag.edgeIndex + 1 === index) {
    return "dragging";
  }
  if (affordance.kind === "vertex" && affordance.index === index) {
    return "hover";
  }
  if (selection?.kind === "area") {
    return "selected";
  }
  return "idle";
}

/** A self-contained 600×400 SVG editor used by the demo and browser proof. */
export function DirectManipulationDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointSequence = useRef(4);
  const [mode, setMode] = useState<EditMode>("direct");
  const [selection, setSelection] = useState<EditSelection>(null);
  const [drawing, setDrawing] = useState<readonly Vertex[] | null>(null);
  const [session, setSession] = useState<EditSession<DemoDocument>>(() =>
    beginSession(SEED_DOCUMENT),
  );
  const [cameraLocked, setCameraLocked] = useState(false);
  const [status, setStatus] = useState("ready");

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

  const handleIntent = useCallback(
    (intent: EditIntent) => {
      setStatus(intent.kind);
      if (intent.kind === "select") {
        setSelection(intent.target);
        return;
      }
      if (intent.kind === "deselect") {
        setSelection(null);
        return;
      }
      if (intent.kind === "nothing" || intent.kind === "refused") {
        return;
      }
      if (intent.kind === "move") {
        commitDocument({
          ...session.current,
          points: updatePoint(session.current.points, intent.id, intent.at),
        });
        return;
      }
      if (intent.kind === "rotate") {
        commitDocument({
          ...session.current,
          points: session.current.points.map((point) =>
            point.id === intent.id ? { ...point, yaw: intent.yaw } : point,
          ),
        });
        return;
      }
      if (intent.kind === "insert") {
        const inserted = createPoint(intent.at);
        const afterIndex = Math.min(
          Math.max(intent.afterIndex, -1),
          session.current.points.length - 1,
        );
        commitDocument({
          ...session.current,
          points: [
            ...session.current.points.slice(0, afterIndex + 1),
            inserted,
            ...session.current.points.slice(afterIndex + 1),
          ],
        });
        return;
      }
      if (intent.kind === "move-vertex") {
        commitDocument({
          ...session.current,
          ring: moveVertex(session.current.ring, intent.index, intent.at),
        });
        return;
      }
      if (intent.kind === "insert-vertex") {
        commitDocument({
          ...session.current,
          ring: insertVertexOnEdge(session.current.ring, intent.edgeIndex, intent.at),
        });
        return;
      }
      if (intent.kind === "delete-handle") {
        commitDocument({
          ...session.current,
          points: session.current.points.filter((point) => point.id !== intent.id),
        });
        setSelection((current) =>
          current?.kind === "handle" && current.id === intent.id ? null : current,
        );
        return;
      }
      if (intent.kind === "delete-vertex") {
        commitDocument({
          ...session.current,
          ring: session.current.ring.filter((_point, index) => index !== intent.index),
        });
        return;
      }
      if (intent.kind === "delete-area") {
        commitDocument({ ...session.current, ring: [] });
        setSelection(null);
        return;
      }
      if (intent.kind === "place") {
        commitDocument({
          ...session.current,
          points: [...session.current.points, createPoint(intent.at)],
        });
        return;
      }
      if (intent.kind === "draw") {
        const nextDrawing = [...(drawing ?? []), intent.at];
        setDrawing(nextDrawing);
        commitDocument({ ...session.current, ring: nextDrawing });
        return;
      }
      if (intent.kind === "close-ring") {
        if (drawing !== null && drawing.length >= 3) {
          commitDocument({ ...session.current, ring: [...drawing] });
          setDrawing(null);
          setMode("direct");
          setSelection(null);
        }
      }
    },
    [commitDocument, createPoint, drawing, session.current],
  );

  const scene = useMemo<EditScene>(
    () => ({
      handles: committedDocument.points.map(({ id, x, y, yaw }) => ({ id, x, y, yaw })),
      paths: [
        {
          id: PATH_ID,
          handleIds: committedDocument.points.map((point) => point.id),
        },
      ],
      areas:
        committedDocument.ring.length === 0
          ? []
          : [{ id: AREA_ID, ring: committedDocument.ring }],
    }),
    [committedDocument],
  );

  const surface = useDirectEditSurface({
    mode,
    scene,
    selection,
    capabilities: { areas: { supported: true } },
    tolerance: TOLERANCE,
    drawing: drawing !== null && drawing.length > 0 ? drawing : null,
    toWorld,
    onIntent: handleIntent,
    onCameraLock: setCameraLocked,
    onModeExhausted: () => setMode("direct"),
    onRefused: (reason) => setStatus(reason),
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
  const selectedHandle =
    selection?.kind === "handle"
      ? renderedDocument.points.find((point) => point.id === selection.id) ?? null
      : null;
  const selectedArea = selection?.kind === "area" && renderedRing.length > 0;
  const headingAnchor = selectedHandle === null
    ? null
    : headingKnobAt(selectedHandle, HEADING_ARM_PX);

  const selectAppendMode = useCallback(() => {
    setMode((current) => (current === "append" ? "direct" : "append"));
  }, []);

  const selectDrawMode = useCallback(() => {
    setMode((current) => (current === "draw-area" ? "direct" : "draw-area"));
    setDrawing((current) => current ?? []);
    setSelection(null);
  }, []);

  const displayedRing = drawing !== null && drawing.length > 0 ? drawing : renderedRing;
  const dynamicGhost =
    surface.affordance.kind === "ghost" || surface.affordance.kind === "ghost-vertex"
      ? surface.affordance
      : null;

  return (
    <Card>
      <CardHeader
        title="Direct manipulation editor (v0.16)"
        hint="SVG proof: drag to edit, click to select"
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
                fill={selectedArea ? "var(--ds-accent-soft)" : "var(--ds-surface)"}
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

            {surface.persistentGhosts.map((ghost) => (
              <g
                key={`persistent-${ghost.pathId}-${ghost.segmentIndex}`}
                data-testid="dm-persistent-ghost"
              >
                <EditGhostHandle x={ghost.at.x} y={ghost.at.y} />
              </g>
            ))}
            {dynamicGhost === null ? null : (
              <g
                data-testid={
                  dynamicGhost.kind === "ghost" ? "dm-ghost" : "dm-ghost-vertex"
                }
              >
                <EditGhostHandle x={dynamicGhost.at.x} y={dynamicGhost.at.y} />
              </g>
            )}

            {renderedDocument.points.map((point) => (
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
                  state={stateForPathPoint(point, surface.affordance, selection, surfaceDrag)}
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
                  state={stateForRingVertex(index, surface.affordance, selection, surfaceDrag)}
                />
              </g>
            ))}

            {selectedHandle === null ? null : (
              <>
                {headingAnchor === null ? null : (
                  <g
                    data-testid="dm-heading-knob"
                    data-x={headingAnchor.x}
                    data-y={headingAnchor.y}
                    data-angle={selectedHandle.yaw ?? 0}
                  >
                    <EditHeadingKnob
                      x={selectedHandle.x}
                      y={selectedHandle.y}
                      angle={selectedHandle.yaw ?? 0}
                      armPx={HEADING_ARM_PX}
                      state={surfaceDrag?.kind === "rotate"
                        ? "dragging"
                        : surface.affordance.kind === "knob"
                          ? "hover"
                          : "idle"}
                    />
                  </g>
                )}
                <g
                  data-testid="dm-remove-badge"
                  data-x={handleBadgeAnchor(selectedHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                  data-y={handleBadgeAnchor(selectedHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
                >
                  <EditRemoveBadge
                    x={handleBadgeAnchor(selectedHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).x}
                    y={handleBadgeAnchor(selectedHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX).y}
                    offsetPx={{ x: 0, y: 0 }}
                  />
                </g>
              </>
            )}

            {selectedArea && renderedRing.length > 0 ? (
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
                      <EditRemoveBadge x={anchor.x} y={anchor.y} offsetPx={{ x: 0, y: 0 }} />
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
          <span data-testid="dm-ring-readout">document ring: {ringReadout(session.current.ring)}</span>
          <span data-testid="dm-yaw-readout">
            yaw: {selectedHandle?.yaw === undefined ? "none" : selectedHandle.yaw.toFixed(3)}
          </span>
          <span data-testid="dm-selection">
            selection: {selection === null ? "none" : `${selection.kind}:${selection.kind === "handle" ? selection.id : selection.id}`}
          </span>
          <span data-testid="dm-undo-count">undo steps: {session.past.length}</span>
          <span data-testid="dm-camera-lock">camera: {cameraLocked ? "locked" : "free"}</span>
          <span data-testid="dm-status">last intent: {status}</span>
        </div>
      </div>
    </Card>
  );
}
