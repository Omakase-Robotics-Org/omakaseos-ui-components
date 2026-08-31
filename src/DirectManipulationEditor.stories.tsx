/**
 * @file Storybook story for the direct-manipulation editing kernel, wired
 * end-to-end through the PUBLIC API only (the barrel `./index` fragments +
 * `./direct-manipulation`'s headless geometry / grammar / session / hook).
 *
 * The `Edit*` stories each mount one SVG fragment in isolation; this story is
 * the layer above that: the smallest real editing surface a consumer would
 * actually wire up. It edits a single path (no keep-out ring / area
 * capability, no append / draw-area modes — `mode` is fixed to "direct") so
 * the wiring reads as a minimal reference rather than a copy of
 * `demo/direct-manipulation-demo.tsx`'s full multi-document, multi-mode proof
 * (which stays a demo/e2e fixture and is intentionally not imported here).
 *
 * Supported interactions:
 *  - drag a handle to move its vertex; Shift constrains the drag to 45°
 *  - click a handle to select it, Shift-click to add another to the selection,
 *    Alt-click to remove one
 *  - dragging any member of a multi-selection moves the whole set, as one
 *    intent and therefore one undo step
 *  - the primary (the one wearing the outer ring) carries the heading knob; drag
 *    it to rotate,
 *    with Shift quantising to 15°
 *  - double-click an armed edge to insert a point exactly there, or hold Alt
 *    over it to see the insertion marker and click
 *  - undo / redo over the session timeline
 *
 * There is deliberately NO delete badge here: with fine input the grammar has
 * none, so a destructive target never floats beside a precise gesture. The
 * removal routes are Alt-click and the host's own controls.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, EditGhostHandle, EditHandle, EditHeadingKnob } from "./index";
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
  headingKnobAt,
  redoEdit,
  sameTarget,
  selectTargets,
  undoEdit,
  useDirectEditSurface,
} from "./direct-manipulation";
import type {
  EditIntent,
  EditScene,
  EditSelection,
  EditSession,
  EditTolerances,
  Vertex,
} from "./direct-manipulation";

const SVG_WIDTH = 320;
const SVG_HEIGHT = 200;
const PATH_ID = "story-path";
const HEADING_ARM_PX = 22;

type EditorPoint = Vertex & { readonly id: string; readonly yaw?: number };
type EditorDocument = { readonly points: readonly EditorPoint[] };

const SEED_DOCUMENT: EditorDocument = {
  points: [
    { id: "a", x: 60, y: 60, yaw: 0 },
    { id: "b", x: 160, y: 110 },
    { id: "c", x: 260, y: 60 },
  ],
};

const TOLERANCE: EditTolerances = {
  handleM: HANDLE_PICK_RADIUS_PX,
  ghostM: GHOST_PICK_RADIUS_PX,
  knobM: KNOB_PICK_RADIUS_PX,
  badgeM: BADGE_PICK_RADIUS_PX,
  headingArmM: HEADING_ARM_PX,
  revealM: REVEAL_RADIUS_PX,
  snapM: SNAP_RADIUS_PX,
};

function replacePoint(
  points: readonly EditorPoint[],
  id: string,
  at: Vertex,
): readonly EditorPoint[] {
  return points.map((point) => (point.id === id ? { ...point, ...at } : point));
}

function polylinePoints(points: readonly Vertex[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

/** The smallest consumer wiring of the direct-manipulation kernel: one editable path. */
function DirectManipulationEditorPreview() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nextPointSeq = useRef(SEED_DOCUMENT.points.length);
  const [selection, setSelection] = useState<EditSelection>(EMPTY_SELECTION);
  const [session, setSession] = useState<EditSession<EditorDocument>>(() =>
    beginSession(SEED_DOCUMENT),
  );

  const document = session.current;

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

  const commitDocument = useCallback((next: EditorDocument) => {
    setSession((current) => commitEdit(current, next));
  }, []);

  const handleIntent = useCallback(
    (intent: EditIntent) => {
      if (intent.kind === "select-set") {
        setSelection((current) => selectTargets(current, intent.targets, intent.additive));
        return;
      }
      if (intent.kind === "deselect") {
        setSelection(EMPTY_SELECTION);
        return;
      }
      if (intent.kind === "move-set") {
        commitDocument({
          points: intent.moves.reduce(
            (points, move) =>
              move.target.kind === "handle"
                ? replacePoint(points, move.target.id, move.at)
                : points,
            document.points,
          ),
        });
        return;
      }
      if (intent.kind === "rotate") {
        commitDocument({
          points: document.points.map((point) =>
            point.id === intent.id ? { ...point, yaw: intent.yaw } : point,
          ),
        });
        return;
      }
      if (intent.kind === "insert") {
        const sequence = nextPointSeq.current;
        nextPointSeq.current += 1;
        const inserted: EditorPoint = { id: `p${sequence}`, ...intent.at };
        const afterIndex = Math.min(
          Math.max(intent.afterIndex, -1),
          document.points.length - 1,
        );
        commitDocument({
          points: [
            ...document.points.slice(0, afterIndex + 1),
            inserted,
            ...document.points.slice(afterIndex + 1),
          ],
        });
        return;
      }
      if (intent.kind === "delete-set") {
        const removed = intent.targets.flatMap((target) =>
          target.kind === "handle" ? [target.id] : [],
        );
        commitDocument({
          points: document.points.filter((point) => !removed.includes(point.id)),
        });
        setSelection((current) => ({
          targets: current.targets.filter(
            (target) => !intent.targets.some((gone) => sameTarget(gone, target)),
          ),
          primary:
            current.primary !== null &&
            intent.targets.some((gone) => sameTarget(gone, current.primary!))
              ? null
              : current.primary,
        }));
      }
      // "place" / "draw" / "close-ring" / run and area intents never fire:
      // mode is fixed to "direct" and this document has no area/ring.
    },
    [commitDocument, document],
  );

  const scene = useMemo<EditScene>(
    () => ({
      handles: document.points.map(({ id, x, y, yaw }) => ({ id, x, y, yaw })),
      paths: [{ id: PATH_ID, handleIds: document.points.map((point) => point.id) }],
      areas: [],
    }),
    [document],
  );

  const surface = useDirectEditSurface({
    mode: "direct",
    // The reference wiring declares every required field explicitly, which is
    // the point: a consumer cannot reach a running editor without saying what
    // its magnet and its grid are.
    arming: "sustained",
    scene,
    selection,
    capabilities: { areas: { supported: false, reason: "story scope: single path only" } },
    tolerance: TOLERANCE,
    drawing: null,
    snapping: { enabled: true, toGeometry: true, toGrid: false },
    grid: null,
    toWorld,
    onIntent: handleIntent,
  });

  const drag = surface.drag;
  const renderedPoints =
    drag === null
      ? document.points
      : drag.kind === "move-set"
        ? drag.moves.reduce(
            (points, move) =>
              move.target.kind === "handle"
                ? replacePoint(points, move.target.id, move.at)
                : points,
            document.points,
          )
        : drag.kind === "rotate"
          ? document.points.map((point) =>
              point.id === drag.id ? { ...point, yaw: drag.yaw } : point,
            )
          : document.points;

  const primary = selection.primary;
  const primaryHandle =
    primary !== null && primary.kind === "handle"
      ? renderedPoints.find((point) => point.id === primary.id) ?? null
      : null;
  const headingAnchor = primaryHandle === null ? null : headingKnobAt(primaryHandle, HEADING_ARM_PX);
  // The insertion marker appears only when the grammar offers one - with fine
  // input that means Alt is held over an edge, which is why hovering an edge
  // here conjures nothing.
  const dynamicGhost = surface.affordance.kind === "ghost" ? surface.affordance : null;

  const stateFor = (point: EditorPoint): "idle" | "hover" | "selected" | "primary" | "dragging" => {
    if (
      drag !== null &&
      ((drag.kind === "move-set" &&
        drag.moves.some((move) => move.target.kind === "handle" && move.target.id === point.id)) ||
        (drag.kind === "rotate" && drag.id === point.id))
    ) {
      return "dragging";
    }
    const target = { kind: "handle", id: point.id } as const;
    if (primary !== null && sameTarget(primary, target)) {
      return "primary";
    }
    if (selection.targets.some((candidate) => sameTarget(candidate, target))) {
      return "selected";
    }
    if (surface.affordance.kind === "handle" && surface.affordance.id === point.id) {
      return "hover";
    }
    return "idle";
  };

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <div style={{ display: "flex", gap: "var(--ds-space-sm)" }}>
        <Button size="sm" disabled={session.past.length === 0} onClick={() => setSession(undoEdit)}>
          Undo
        </Button>
        <Button size="sm" disabled={session.future.length === 0} onClick={() => setSession(redoEdit)}>
          Redo
        </Button>
      </div>
      <div
        {...surface.surfaceProps}
        style={{
          ...surface.surfaceProps.style,
          width: `${SVG_WIDTH}px`,
          touchAction: "none",
          borderRadius: "var(--ds-radius-control)",
        }}
      >
        <svg
          ref={svgRef}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ display: "block", background: "var(--ds-surface-inset)" }}
        >
          <polyline
            points={polylinePoints(renderedPoints)}
            fill="none"
            stroke="var(--ds-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {surface.persistentGhosts.map((ghost) => (
            <EditGhostHandle
              key={`${ghost.pathId}-${ghost.segmentIndex}`}
              x={ghost.at.x}
              y={ghost.at.y}
              state="idle"
            />
          ))}
          {dynamicGhost === null ? null : (
            <EditGhostHandle x={dynamicGhost.at.x} y={dynamicGhost.at.y} state="hover" />
          )}
          {renderedPoints.map((point) => (
            <EditHandle
              key={point.id}
              x={point.x}
              y={point.y}
              kind="place"
              state={stateFor(point)}
              heading={point.yaw}
            />
          ))}
          {primaryHandle === null || headingAnchor === null ? null : (
            <EditHeadingKnob
              x={primaryHandle.x}
              y={primaryHandle.y}
              angle={primaryHandle.yaw ?? 0}
              armPx={HEADING_ARM_PX}
              state={drag?.kind === "rotate" ? "dragging" : surface.affordance.kind === "knob" ? "hover" : "idle"}
            />
          )}
        </svg>
      </div>
      <p style={{ margin: 0, color: "var(--ds-text-muted)", fontSize: "var(--ds-font-size-label)" }}>
        drag a handle to move it · click one to select it, then drag its knob
        to rotate · Shift-click to add another · Alt-click to remove one ·
        double-click an armed edge to insert a point there · Shift constrains a
        drag to 45°
      </p>
    </div>
  );
}

const meta = {
  title: "DirectManipulation/Editor",
  component: DirectManipulationEditorPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof DirectManipulationEditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
