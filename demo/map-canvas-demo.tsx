/**
 * @file The map-canvas editor inside the demo harness — the browser-proof
 * host for `src/MapCanvasEditorSurface.tsx`.
 *
 * ## Why this panel exists at all
 *
 * `bun run build-storybook` only COMPILES a story. A story can therefore be
 * broken at runtime — a handle that balloons at 8x, a wheel that walks the map
 * out from under the pointer, an edge nobody can click — and still pass the
 * gate that this repository fires on every land. The demo harness is the other
 * half of `REPO_VERIFY_CMD` (`repos.conf.d/ui-components.conf`) and the only
 * one that runs a real browser: `bun run test:e2e`, against this page.
 *
 * So the practical map editor is mounted here, and `spec/map-canvas.e2e.spec.ts`
 * drives it with real wheel, pointer, modifier and double-click events.
 *
 * ## Mounted ON DEMAND, like `OverlayDemoPanel`'s edge fixtures
 *
 * The harness renders every panel once per host — three times — and this one
 * carries a 44 KiB occupancy raster to decode and a 22-vertex / 22-edge editor
 * to lay out, in a 420 px-tall pointer surface that declares
 * `touch-action: none` and swallows the wheel. Every OTHER e2e spec in this
 * suite loads `/` too (twelve of them, many times each), and none of them has
 * any use for three decoded rasters and three live editing surfaces.
 *
 * The precedent is already here: `OverlayDemoPanel` keeps its viewport-edge
 * fixtures unmounted until armed because mounted they floated over another
 * spec's pointer targets. The cost here is different in kind (weight, not
 * interference) but the answer is the same one the harness already made — the
 * panel states what it is, and mounts the editor only when a reader or the
 * e2e presses its button. `spec/map-canvas.e2e.spec.ts` arms exactly one host.
 *
 * ## Readouts
 *
 * The overlay is `aria-hidden` decorative SVG over a picture, so the editor's
 * state is invisible to anything outside its closure: a spec can see a circle
 * at (412, 233), and cannot see which vertex that is, what the committed
 * document says, how far in the viewport is zoomed, or how deep undo goes.
 * `MapCanvasEditorSurface`'s `instrument` hands this file that state and it is
 * published as `mc-*` testids — the same job the `dm-*` readouts do for the
 * direct-manipulation demo, and for the same reason.
 *
 * The one readout that is a MEASUREMENT rather than a state (`mc-handle-measure`)
 * publishes the nominated handle's rendered box, read back from the live DOM
 * with `getBoundingClientRect`. It is polled to a fixed point across frames
 * because `EditHandle`'s ring transitions its `r` over
 * `--ds-transition-fast` (120 ms): a single post-render measurement would
 * publish a number from the middle of an animation.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button, Card, CardHeader } from "../src/index";
import {
  MapCanvasEditorSurface,
  type MapCanvasEditorReadout,
} from "../src/MapCanvasEditorSurface";

/**
 * The handle whose rendered size is published. "0000" is `home`, a station
 * near the middle of the graph — the e2e zooms about this one, so the number
 * the panel publishes and the number the spec measures are about the same
 * circle.
 */
const NOMINATED_HANDLE = "0000";

/** How many identical frames end the measurement poll. */
const STABLE_FRAMES = 3;

const readoutStyle = {
  display: "grid",
  gap: "var(--ds-space-2xs)",
  color: "var(--ds-text-muted)",
  fontFamily: "var(--ds-font-mono)",
  fontSize: "var(--ds-font-size-label)",
  overflowWrap: "anywhere",
} as const;

type Measured = { readonly width: number; readonly height: number };

/**
 * The nominated handle's rendered box, polled until it stops changing.
 *
 * Re-armed on EVERY render (no dependency array) because every viewport,
 * selection and document change re-renders this component, and each of those
 * can move or resize the circle. The poll stops itself after
 * {@link STABLE_FRAMES} identical frames, so a settled editor costs nothing.
 */
function useMeasuredHandle(root: RefObject<HTMLDivElement | null>): Measured | null {
  const [measured, setMeasured] = useState<Measured | null>(null);
  useEffect(() => {
    let frame = 0;
    let stable = 0;
    let last = "";
    const tick = () => {
      const circle = root.current?.querySelector(
        `[data-point-id="${NOMINATED_HANDLE}"] circle:last-of-type`,
      );
      if (circle !== null && circle !== undefined) {
        const box = circle.getBoundingClientRect();
        const key = `${box.width.toFixed(3)}x${box.height.toFixed(3)}`;
        const animating = circle
          .getAnimations()
          .some((animation) => animation.playState === "running");
        if (animating) {
          // The ring transitions its `r` over --ds-transition-fast, and `r` is
          // what the counter-scale rewrites on every zoom. An ease-out's last
          // frames differ by less than this reading, so "three identical
          // frames" alone would publish a number from the middle of a zoom.
          stable = 0;
          last = key;
        } else if (key === last) {
          stable += 1;
        } else {
          stable = 0;
          last = key;
          setMeasured({ width: box.width, height: box.height });
        }
      }
      if (stable < STABLE_FRAMES) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  });
  return measured;
}

function targetKey(target: { readonly kind: string; readonly id?: string }): string {
  return target.id === undefined ? target.kind : `${target.kind}:${target.id}`;
}

/** Everything about the live editor that the picture does not say. */
function MapCanvasReadouts({
  readout,
  root,
}: {
  readonly readout: MapCanvasEditorReadout;
  readonly root: RefObject<HTMLDivElement | null>;
}) {
  const measured = useMeasuredHandle(root);
  return (
    <div style={readoutStyle}>
      <span data-testid="mc-zoom" data-zoom={readout.viewport.zoom}>
        zoom: {readout.viewport.zoom.toFixed(4)}
      </span>
      <span
        data-testid="mc-pan"
        data-pan-x={readout.viewport.panX}
        data-pan-y={readout.viewport.panY}
      >
        pan: {readout.viewport.panX.toFixed(2)}, {readout.viewport.panY.toFixed(2)}
      </span>
      <span data-testid="mc-scale" data-scale={readout.scale}>
        raster units per screen px: {readout.scale.toFixed(4)}
      </span>
      <span data-testid="mc-vertex-count">{readout.points.length}</span>
      <span data-testid="mc-edge-count">{readout.edges.length}</span>
      <span data-testid="mc-undo-depth">{readout.undoDepth}</span>
      <span data-testid="mc-redo-depth">{readout.redoDepth}</span>
      <span data-testid="mc-selection">
        selection:{" "}
        {readout.selection.targets.length === 0
          ? "none"
          : readout.selection.targets.map(targetKey).join(",")}
      </span>
      <span data-testid="mc-selection-count">{readout.selection.targets.length}</span>
      <span data-testid="mc-selection-primary">{readout.selectionSummary}</span>
      <span data-testid="mc-affordance">affordance: {readout.affordance}</span>
      <span data-testid="mc-cursor">cursor: {readout.cursor}</span>
      <span data-testid="mc-marquee">
        marquee:{" "}
        {readout.marqueeCandidates === null
          ? "none"
          : `${String(readout.marqueeCandidates)} candidates`}
      </span>
      {/* No testid: the spec asserts nothing about the magnet's evidence, and a
          testid nothing reads is a hook that looks like coverage. It is here
          for a reader watching the surface. */}
      <span>snap: {readout.snap ?? "none"}</span>
      <span data-testid="mc-magnet">magnet: {readout.magnet ? "on" : "off"}</span>
      <span data-testid="mc-notice">{readout.notice ?? "none"}</span>
      <span
        data-testid="mc-handle-measure"
        // Deliberately NOT `data-point-id`: that attribute names a DRAWN
        // object in the overlay, and a readout that answered the same
        // selector would be a second thing a spec's "is it still drawn?"
        // query could find.
        data-measured-point={NOMINATED_HANDLE}
        data-width={measured === null ? "" : measured.width}
        data-height={measured === null ? "" : measured.height}
      >
        handle {NOMINATED_HANDLE} on screen:{" "}
        {measured === null
          ? "unmeasured"
          : `${measured.width.toFixed(2)} x ${measured.height.toFixed(2)} px`}
      </span>
      {/* The committed document, one element per object. A spec asserts on
          coordinates and on which lines still exist after a delete or a
          split; both are numbers no screenshot carries. */}
      <span>
        {readout.points.map((point) => (
          <span
            key={point.id}
            data-testid="mc-point"
            data-id={point.id}
            data-x={point.x}
            data-y={point.y}
            data-yaw={point.yaw}
            data-type={point.type === 2 ? "station" : "path-point"}
          >
            {point.id}:{point.x.toFixed(3)},{point.y.toFixed(3)}{" "}
          </span>
        ))}
      </span>
      <span>
        {readout.edges.map((edge) => (
          <span
            key={edge.id}
            data-testid="mc-edge"
            data-id={edge.id}
            data-src={edge.src}
            data-dst={edge.dst}
          >
            {edge.id}:{edge.src}→{edge.dst}{" "}
          </span>
        ))}
      </span>
    </div>
  );
}

/** The armable panel: the practical map editor, in one demo host. */
export function MapCanvasDemoPanel({ host }: { readonly host: string }) {
  const [armed, setArmed] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  return (
    <Card>
      <CardHeader
        title="Map canvas: practical editor (v0.21)"
        hint="real cuc_1_north raster + road graph — armed on demand"
      />
      <div style={{ display: "grid", gap: "var(--ds-space-md)", minWidth: 0 }}>
        <div>
          <Button
            size="sm"
            data-testid={`mc-arm-${host}`}
            aria-pressed={armed}
            onClick={() => {
              setArmed((current) => !current);
            }}
          >
            {armed ? "Disarm map editor" : "Arm map editor"}
          </Button>
        </div>
        {armed ? (
          <div data-testid="mc-editor" ref={root}>
            <MapCanvasEditorSurface
              canvasHeightPx={420}
              twin="below"
              instrument={(readout) => <MapCanvasReadouts readout={readout} root={root} />}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
