/**
 * @file Storybook story for the direct-manipulation editing kernel, wired
 * end-to-end through the PUBLIC API only (the barrel `./index` fragments +
 * `./direct-manipulation`'s headless geometry / grammar / session / hook).
 *
 * The four `Edit*` stories each mount one SVG fragment in isolation; this
 * story is the layer above that: the smallest real editing surface a
 * consumer would actually wire up. It edits a single path (no keep-out
 * ring / area capability, no append / draw-area modes — `mode` is fixed to
 * "direct") so the wiring reads as a minimal reference rather than a copy
 * of `demo/direct-manipulation-demo.tsx`'s full multi-document, multi-mode
 * proof (which stays a demo/e2e fixture and is intentionally not imported
 * here).
 *
 * Supported interactions:
 *  - drag a handle to move its vertex
 *  - hover an edge midpoint (a "ghost") and drag it to insert a new vertex
 *  - click a handle to select it, revealing its heading knob and remove badge
 *  - drag the heading knob to rotate the selected handle
 *  - click the remove badge to delete the selected handle
 *  - undo / redo over the session timeline
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, EditGhostHandle, EditHandle, EditHeadingKnob, EditRemoveBadge } from "./index";
import {
  BADGE_ANCHOR_OFFSET_SCALE,
  BADGE_RADIUS_PX,
  GHOST_PICK_RADIUS_PX,
  HANDLE_RADIUS_PX,
  KNOB_RADIUS_PX,
  beginSession,
  commitEdit,
  handleBadgeAnchor,
  headingKnobAt,
  redoEdit,
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
  handleM: HANDLE_RADIUS_PX,
  ghostM: GHOST_PICK_RADIUS_PX,
  knobM: KNOB_RADIUS_PX,
  badgeM: BADGE_RADIUS_PX,
  headingArmM: HEADING_ARM_PX,
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
  const [selection, setSelection] = useState<EditSelection>(null);
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
      if (intent.kind === "select") {
        setSelection(intent.target);
        return;
      }
      if (intent.kind === "deselect") {
        setSelection(null);
        return;
      }
      if (intent.kind === "move") {
        commitDocument({ points: replacePoint(document.points, intent.id, intent.at) });
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
      if (intent.kind === "delete-handle") {
        commitDocument({ points: document.points.filter((point) => point.id !== intent.id) });
        setSelection((current) =>
          current?.kind === "handle" && current.id === intent.id ? null : current,
        );
      }
      // "place" / "draw" / "close-ring" / vertex+area intents never fire:
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
    scene,
    selection,
    capabilities: { areas: { supported: false, reason: "story scope: single path only" } },
    tolerance: TOLERANCE,
    drawing: null,
    toWorld,
    onIntent: handleIntent,
  });

  const drag = surface.drag;
  const renderedPoints =
    drag !== null && (drag.kind === "move" || drag.kind === "rotate")
      ? drag.kind === "move"
        ? replacePoint(document.points, drag.id, drag.at)
        : document.points.map((point) => (point.id === drag.id ? { ...point, yaw: drag.yaw } : point))
      : document.points;

  const selectedHandle =
    selection?.kind === "handle"
      ? renderedPoints.find((point) => point.id === selection.id) ?? null
      : null;
  const headingAnchor = selectedHandle === null ? null : headingKnobAt(selectedHandle, HEADING_ARM_PX);
  const badgeAnchor =
    selectedHandle === null
      ? null
      : handleBadgeAnchor(selectedHandle, BADGE_ANCHOR_OFFSET_SCALE * BADGE_RADIUS_PX);
  const dynamicGhost = surface.affordance.kind === "ghost" ? surface.affordance : null;

  const stateFor = (point: EditorPoint): "idle" | "hover" | "selected" | "dragging" => {
    if (drag !== null && (drag.kind === "move" || drag.kind === "rotate") && drag.id === point.id) {
      return "dragging";
    }
    if (selection?.kind === "handle" && selection.id === point.id) {
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
            <EditGhostHandle key={`${ghost.pathId}-${ghost.segmentIndex}`} x={ghost.at.x} y={ghost.at.y} />
          ))}
          {dynamicGhost === null ? null : <EditGhostHandle x={dynamicGhost.at.x} y={dynamicGhost.at.y} />}
          {renderedPoints.map((point) => (
            <EditHandle key={point.id} x={point.x} y={point.y} state={stateFor(point)} heading={point.yaw} />
          ))}
          {selectedHandle === null ? null : (
            <>
              {headingAnchor === null ? null : (
                <EditHeadingKnob
                  x={selectedHandle.x}
                  y={selectedHandle.y}
                  angle={selectedHandle.yaw ?? 0}
                  armPx={HEADING_ARM_PX}
                  state={drag?.kind === "rotate" ? "dragging" : surface.affordance.kind === "knob" ? "hover" : "idle"}
                />
              )}
              {badgeAnchor === null ? null : (
                <EditRemoveBadge x={badgeAnchor.x} y={badgeAnchor.y} offsetPx={{ x: 0, y: 0 }} />
              )}
            </>
          )}
        </svg>
      </div>
      <p style={{ margin: 0, color: "var(--ds-text-muted)", fontSize: "var(--ds-font-size-label)" }}>
        drag a handle to move it · hover an edge midpoint to insert · click a
        handle to select, then drag its knob to rotate or click its badge to
        delete
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
