/**
 * @file Storybook stories for `<MapCanvas/>` — the CANVAS on its own.
 *
 * These stories exercise the viewport and nothing else: fit-to-box on first
 * measure, wheel-zoom at the cursor, drag-to-pan on either the primary or the
 * middle button, and a controlled viewport driven from outside. There is no
 * editing here at all, and the absence is the point — not one symbol from
 * `./direct-manipulation` is imported, which is the evidence that the canvas
 * really is editing-agnostic. `MapCanvasEditor.stories.tsx` is the other half:
 * the same canvas with the whole editing grammar composed onto it.
 *
 * The picture is the REAL `cuc_1_north` occupancy raster exported from a d1
 * AMR (706x412 px at 0.1 m/px, about 70 m of hospital corridor), so the
 * gestures are being judged at the scale they are actually used at rather
 * than on a synthetic square.
 */
import { useCallback, useRef, useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, ButtonRow } from "./index";
import { MapCanvas } from "./MapCanvas";
import {
  CUC_1_NORTH_RASTER,
  CUC_1_NORTH_ROAD_GRAPH,
} from "./map-canvas/cuc-1-north.fixture";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  zoomAbout,
  type MapViewport,
  type RasterFrame,
} from "./map-canvas";

const FRAME: RasterFrame = {
  pixelWidth: CUC_1_NORTH_RASTER.pixelWidth,
  pixelHeight: CUC_1_NORTH_RASTER.pixelHeight,
  resolution: CUC_1_NORTH_RASTER.resolution,
  originX: CUC_1_NORTH_RASTER.originX,
  originY: CUC_1_NORTH_RASTER.originY,
};

const ALT = "Occupancy raster for the cuc_1_north map";

/** One press of a zoom button. A ratio, so the step is the same at every zoom. */
const ZOOM_BUTTON_STEP = 1.5;

/** A radius in screen pixels for the plain markers the overlay story draws. */
const MARKER_RADIUS_PX = 5;

const hint: CSSProperties = {
  margin: 0,
  color: "var(--ds-text-muted)",
  fontSize: "var(--ds-font-size-label)",
  lineHeight: "var(--ds-line-height-text)",
};

const viewportBox: CSSProperties = {
  height: "480px",
  maxWidth: "760px",
};

/** The canvas with nothing drawn on it: the viewport, by itself. */
function BareCanvas() {
  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <div style={viewportBox}>
        <MapCanvas frame={FRAME} src={CUC_1_NORTH_RASTER.dataUri} alt={ALT}>
          {() => null}
        </MapCanvas>
      </div>
      <p style={hint}>
        The whole 70 m map is fitted to the box on first measure. Wheel to zoom
        about the pointer · drag with the primary or the middle button to pan.
      </p>
    </div>
  );
}

/**
 * The canvas with its viewport held OUTSIDE it.
 *
 * This is the posture an editor needs: pick tolerances are stated in metres
 * and have to be recomputed from the zoom before the pointer layer is built,
 * which is strictly before the canvas renders. Holding the viewport here is
 * what makes that possible, and the buttons below are simply the same state
 * being written from somewhere other than a gesture.
 */
function ControlledCanvas() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<MapViewport>({ zoom: 1, panX: 0, panY: 0 });
  const [fitNonce, setFitNonce] = useState(0);

  const zoomByButton = useCallback((factor: number) => {
    const box = boxRef.current;
    const width = box?.clientWidth ?? 0;
    const height = box?.clientHeight ?? 0;
    setViewport((current) =>
      zoomAbout(current, clampZoom(current.zoom * factor), {
        x: width / 2,
        y: height / 2,
      }),
    );
  }, []);

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <ButtonRow>
        <Button
          size="sm"
          disabled={viewport.zoom <= MIN_ZOOM}
          onClick={() => {
            zoomByButton(1 / ZOOM_BUTTON_STEP);
          }}
        >
          Zoom out
        </Button>
        <Button
          size="sm"
          disabled={viewport.zoom >= MAX_ZOOM}
          onClick={() => {
            zoomByButton(ZOOM_BUTTON_STEP);
          }}
        >
          Zoom in
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setFitNonce((current) => current + 1);
          }}
        >
          Fit
        </Button>
        <span
          style={{
            alignSelf: "center",
            fontFamily: "var(--ds-font-mono)",
            fontSize: "var(--ds-font-size-label)",
            color: "var(--ds-text-secondary)",
          }}
        >
          {viewport.zoom.toFixed(2)}x
        </span>
      </ButtonRow>
      <div ref={boxRef} style={viewportBox}>
        <MapCanvas
          frame={FRAME}
          src={CUC_1_NORTH_RASTER.dataUri}
          alt={ALT}
          viewport={viewport}
          onViewportChange={setViewport}
          fitNonce={fitNonce}
        >
          {() => null}
        </MapCanvas>
      </div>
      <p style={hint}>
        The zoom readout is the state this story holds, whether a gesture or a
        button wrote it. &quot;Fit&quot; asks for a refit; asking twice in a row
        works, because the request is a counter and not a flag.
      </p>
    </div>
  );
}

/**
 * The render prop, and the one property that makes a map surface feel right.
 *
 * Every marker is drawn with its radius MULTIPLIED by `geometry.scale` — raster
 * units per screen pixel — so it stays five screen pixels across at every zoom.
 * Zoom in and the corridor grows while the dots do not; that is the whole
 * discipline, and the editor story applies it to every handle, knob and
 * tolerance it has.
 */
function OverlayCanvas() {
  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <div style={viewportBox}>
        <MapCanvas frame={FRAME} src={CUC_1_NORTH_RASTER.dataUri} alt={ALT}>
          {({ project, scale }) => (
            <g>
              {CUC_1_NORTH_ROAD_GRAPH.points.map((point) => {
                const at = project(point);
                return (
                  <circle
                    key={point.id}
                    cx={at.col}
                    cy={at.row}
                    r={MARKER_RADIUS_PX * scale}
                    fill={point.type === 2 ? "var(--ds-accent)" : "var(--ds-text-muted)"}
                  />
                );
              })}
            </g>
          )}
        </MapCanvas>
      </div>
      <p style={hint}>
        The 22 real road-graph vertices, projected into the raster&apos;s own
        pixel space. Zoom in: the map grows, the dots do not.
      </p>
    </div>
  );
}

const meta = {
  title: "MapCanvas/Canvas",
  component: BareCanvas,
  tags: ["autodocs"],
} satisfies Meta<typeof BareCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Controlled: Story = {
  render: () => <ControlledCanvas />,
};

export const WithOverlay: Story = {
  render: () => <OverlayCanvas />,
};
