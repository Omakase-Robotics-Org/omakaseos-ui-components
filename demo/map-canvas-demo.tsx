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
 * because the glyph body transitions its PAINT over `--ds-transition-fast`
 * (120 ms) and the placement group's counter-scale is rewritten on every
 * zoom: a single post-render measurement would publish a number from the
 * middle of an animation.
 *
 * ## The raster paint fixture, armed separately
 *
 * `<MapRasterLayer/>` edits the PICTURE's own pixels rather than affordances
 * over it, so nothing about it is visible in the editor's readouts and no
 * story runs in a browser. It is mounted here, in its own armable block, with
 * a nominated cell's byte published as `mcr-pixel` — the one number that says
 * whether a brush actually wrote the vocabulary's value into the document
 * (0 occupied / 255 free / 128 unknown, `map-canvas/raster-edit.ts`).
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button, ButtonRow, Card, CardHeader } from "../src/index";
import {
  MapCanvasEditorSurface,
  type MapCanvasEditorReadout,
} from "../src/MapCanvasEditorSurface";
import { MapRasterLayer } from "../src/MapRasterLayer";
import { keepOutKindOf } from "../src/map-canvas/scene-document";
import {
  UNKNOWN_PIXEL,
  blankOccupancyDocument,
  type OccupancyDocument,
  type OccupancyValue,
} from "../src/map-canvas";
import {
  beginSession,
  commitEdit,
  undoEdit,
  type EditSession,
  type EditTarget,
} from "../src/direct-manipulation";

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
 * can move the glyph. The poll stops itself after {@link STABLE_FRAMES}
 * identical frames, so a settled editor costs nothing.
 *
 * The measured element is the glyph BODY (`[data-edit-glyph]`), asked for by
 * ROLE and not by tag: since v0.20 an anchor is a `<rect>` and a place is the
 * same rect rotated, so a `circle` selector here would silently match nothing
 * and publish "unmeasured" forever — a readout that a spec could compare
 * against and learn nothing from.
 */
function useMeasuredHandle(root: RefObject<HTMLDivElement | null>): Measured | null {
  const [measured, setMeasured] = useState<Measured | null>(null);
  useEffect(() => {
    let frame = 0;
    let stable = 0;
    let last = "";
    const tick = () => {
      const glyph = root.current?.querySelector(
        `[data-point-id="${NOMINATED_HANDLE}"] [data-edit-glyph]`,
      );
      if (glyph !== null && glyph !== undefined) {
        const box = glyph.getBoundingClientRect();
        const key = `${box.width.toFixed(3)}x${box.height.toFixed(3)}`;
        const animating = glyph
          .getAnimations()
          .some((animation) => animation.playState === "running");
        if (animating) {
          // The body transitions its paint over --ds-transition-fast, and the
          // placement group's counter-scale is rewritten on every zoom. An
          // ease-out's last frames differ by less than this reading, so "three
          // identical frames" alone would publish a number from mid-zoom.
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

/**
 * One selection target, in one string.
 *
 * A ring corner names an AREA and an INDEX rather than an id, and it is a
 * target an operator reaches by clicking an armed keep-out's corner — so it is
 * spelled out here rather than collapsed to the bare word "vertex", which
 * would make every corner of every area read as the same selection.
 */
function targetKey(target: EditTarget): string {
  if (target.kind === "vertex") {
    return `vertex:${target.areaId}#${String(target.index)}`;
  }
  return `${target.kind}:${target.id}`;
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
      {/* The two element kinds the picture states only as shapes: a spec
          cannot tell a two-point keep-out from a three-point one by looking
          at a `<line>`, and it cannot read a zone's vendor numeral at all. */}
      <span data-testid="mc-keepout-count">{readout.keepOuts.length}</span>
      <span data-testid="mc-splice-count">{readout.spliceAreas.length}</span>
      {/* Which mode is armed decides what the NEXT click means, and the run
          length is how far into a drawing the operator is — both are chrome
          state that no drawn object carries. */}
      <span data-testid="mc-mode">{readout.mode}</span>
      <span data-testid="mc-run-length">{readout.runLength}</span>
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
          split; both are numbers no screenshot carries. `data-label` is the
          station's operator name, published because a retype DROPS it — and
          "the canvas stopped drawing a word" is a weaker statement than "the
          document no longer holds one". */}
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
            data-label={point.defineType ?? ""}
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
      {/* Keep-out entries, with the POINT COUNT that decides what each one is
          (`keepOutKindOf`: two points are a virtual wall, three or more a
          forbidden polygon). `data-kind` is that decision, taken FROM
          that function rather than re-derived here, so a spec asserting on
          the promotion asserts against the rule the document applies. The drawn objects carry
          `data-area-kind`, which is the entry's LIST (`keep-out` / `splice`)
          and not its shape. */}
      <span>
        {readout.keepOuts.map((area) => (
          <span
            key={area.id}
            data-testid="mc-keepout"
            data-id={area.id}
            data-points={area.points.length}
            data-kind={keepOutKindOf(area.points)}
          >
            {area.id}:{area.points.length}{" "}
          </span>
        ))}
      </span>
      <span>
        {readout.spliceAreas.map((area) => (
          <span
            key={area.id}
            data-testid="mc-splice"
            data-id={area.id}
            data-type={area.type}
            data-points={area.points.length}
          >
            {area.id}:{area.type}{" "}
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
        <RasterPaintFixture host={host} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The raster paint fixture
// ---------------------------------------------------------------------------

/**
 * The paintable document's size, in cells.
 *
 * Small and deliberately not the real 706x412 export: the claim under test is
 * that a brush writes the vocabulary's BYTE into the cells it covers, and a
 * 3,072-cell document lets this file count every changed cell on every render
 * instead of sampling.
 */
const RASTER_CELLS = { width: 64, height: 48 } as const;

/** How large the layer is drawn, in CSS pixels: exactly four per cell. */
const RASTER_DRAWN = { width: 256, height: 192 } as const;

/** The brush radius, in cells. Large enough to cover the nominated cell from its own centre. */
const RASTER_BRUSH_CELLS = 3;

/**
 * The cell whose byte is published.
 *
 * The document's own centre, so a spec computes where to press from the
 * published `data-col` / `data-row` and the layer's live rectangle rather than
 * from a number agreed by convention with this file.
 */
const NOMINATED_CELL = {
  col: Math.floor(RASTER_CELLS.width / 2),
  row: Math.floor(RASTER_CELLS.height / 2),
} as const;

/** The three values the brush can paint, in the order the buttons appear. */
const BRUSH_VALUES: readonly OccupancyValue[] = ["occupied", "free", "unknown"];

/**
 * `<MapRasterLayer/>` in a browser, with an undo timeline and the one byte a
 * spec has to read.
 *
 * The document opens filled with `unknown` (128) — the byte the robot's SLAM
 * writes for ground nothing has mapped — because that is the value an operator
 * paints OVER, and because a document that opened as `free` would make a
 * "paint free" assertion vacuous.
 *
 * The timeline is here rather than in the component on purpose: the layer
 * fires `onPaint` exactly once per finished stroke (its "commit granularity"
 * rule), which is precisely the granularity `commitEdit` wants, and a host
 * that wired one call per pointer sample would be the thing that broke undo.
 */
function RasterPaintFixture({ host }: { readonly host: string }) {
  const [armed, setArmed] = useState(false);
  const [session, setSession] = useState<EditSession<OccupancyDocument>>(() =>
    beginSession(blankOccupancyDocument(RASTER_CELLS.width, RASTER_CELLS.height, "unknown")),
  );
  const [brush, setBrush] = useState<OccupancyValue>("occupied");

  const document = session.current;
  const nominated =
    document.pixels[NOMINATED_CELL.row * document.width + NOMINATED_CELL.col] ?? UNKNOWN_PIXEL;
  // How much of the picture is no longer what it opened as. Counted over the
  // whole buffer, so "the stroke wrote something" and "undo put it all back"
  // are the same number read twice, not two different instruments.
  let changed = 0;
  for (const value of document.pixels) {
    if (value !== UNKNOWN_PIXEL) {
      changed += 1;
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-sm)", minWidth: 0 }}>
      <div>
        <Button
          size="sm"
          data-testid={`mcr-arm-${host}`}
          aria-pressed={armed}
          onClick={() => {
            setArmed((current) => !current);
          }}
        >
          {armed ? "Disarm raster paint" : "Arm raster paint"}
        </Button>
      </div>
      {!armed ? null : (
        <div data-testid="mcr-fixture" style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <ButtonRow>
            {BRUSH_VALUES.map((value) => (
              <Button
                key={value}
                size="sm"
                data-testid={`mcr-brush-${value}`}
                aria-pressed={brush === value}
                variant={brush === value ? "primary" : "secondary"}
                onClick={() => {
                  setBrush(value);
                }}
              >
                {value}
              </Button>
            ))}
            <Button
              size="sm"
              data-testid="mcr-undo"
              disabled={session.past.length === 0}
              onClick={() => {
                setSession(undoEdit);
              }}
            >
              Undo paint
            </Button>
          </ButtonRow>
          <MapRasterLayer
            document={document}
            onPaint={(next) => {
              setSession((current) => commitEdit(current, next));
            }}
            brushRadiusCells={RASTER_BRUSH_CELLS}
            brushValue={brush}
            widthPx={RASTER_DRAWN.width}
            heightPx={RASTER_DRAWN.height}
          />
          <div style={readoutStyle}>
            <span
              data-testid="mcr-pixel"
              data-col={NOMINATED_CELL.col}
              data-row={NOMINATED_CELL.row}
              data-value={nominated}
            >
              cell {NOMINATED_CELL.col},{NOMINATED_CELL.row}: {nominated}
            </span>
            <span data-testid="mcr-changed" data-changed={changed}>
              changed cells: {changed}
            </span>
            <span data-testid="mcr-undo-depth">{session.past.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
