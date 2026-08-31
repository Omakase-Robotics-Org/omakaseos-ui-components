/**
 * @file Storybook stories for `<MapRasterLayer/>` — painting the OCCUPANCY
 * GRID's own pixels, composed as `<MapCanvas/>`'s `picture`.
 *
 * The starting document is the REAL `cuc_1_north` raster
 * (`map-canvas/cuc-1-north.fixture.ts`), decoded off its PNG data URI
 * through an offscreen canvas — the same trick
 * `robot-status-server-app`'s `SceneEditorCanvas.tsx` (`readGrayscalePixels`)
 * uses to get bytes back out of a picture the browser already decoded, since
 * neither an `<img>` nor a data URI exposes its pixels directly.
 *
 * Painting is wired through `../direct-manipulation/session.ts`'s generic
 * `EditSession<D>` — `beginSession`/`commitEdit`/`undoEdit`/`redoEdit` — with
 * no adapter in between, which is this story's live proof that
 * `OccupancyDocument` really is a usable `D`: undo takes back exactly one
 * finished STROKE (see `MapRasterLayer.tsx`'s "commit granularity" note),
 * never one pointer sample.
 */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button, ButtonRow } from "./index";
import { MapCanvas } from "./MapCanvas";
import { MapRasterLayer } from "./MapRasterLayer";
import { CUC_1_NORTH_RASTER } from "./map-canvas/cuc-1-north.fixture";
import {
  createOccupancyDocument,
  type OccupancyDocument,
  type OccupancyValue,
  type RasterFrame,
} from "./map-canvas";
import {
  beginSession,
  canRedo,
  canUndo,
  commitEdit,
  redoEdit,
  undoEdit,
  type EditSession,
} from "./direct-manipulation/session";

const FRAME: RasterFrame = {
  pixelWidth: CUC_1_NORTH_RASTER.pixelWidth,
  pixelHeight: CUC_1_NORTH_RASTER.pixelHeight,
  resolution: CUC_1_NORTH_RASTER.resolution,
  originX: CUC_1_NORTH_RASTER.originX,
  originY: CUC_1_NORTH_RASTER.originY,
};

/** A visible brush: big enough to see land on a 706x412 map without covering half the corridor. */
const BRUSH_RADIUS_CELLS = 7;

const hint: CSSProperties = {
  margin: 0,
  color: "var(--ds-text-muted)",
  fontSize: "var(--ds-font-size-label)",
  lineHeight: "var(--ds-line-height-text)",
};

const viewportBox: CSSProperties = {
  height: "520px",
  maxWidth: "760px",
};

/**
 * Decode the fixture's PNG data URI into an {@link OccupancyDocument}, off an
 * offscreen canvas — the same read-back-through-canvas trick
 * `readGrayscalePixels` in robot-status-server-app's `raster-pixels.ts` uses,
 * because neither a data URI nor a decoded `<img>` exposes its bytes any
 * other way. The RED channel is taken as the grayscale value for the same
 * reason that module documents: this is an 8-bit grayscale PNG, so the
 * browser expands every pixel to `r = g = b = v`.
 */
function useDecodedRaster(dataUri: string): OccupancyDocument | null {
  const [document, setDocument] = useState<OccupancyDocument | null>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) {
        return;
      }
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const canvas = window.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context === null) {
        return;
      }
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, width, height).data;
      const pixels = new Uint8Array(width * height);
      for (let index = 0; index < pixels.length; index += 1) {
        pixels[index] = rgba[index * 4] ?? 0;
      }
      setDocument(createOccupancyDocument(width, height, pixels));
    };
    image.src = dataUri;
    return () => {
      cancelled = true;
    };
  }, [dataUri]);
  return document;
}

const BRUSH_LABEL: Record<OccupancyValue, string> = {
  occupied: "Occupied",
  free: "Free",
  unknown: "Unknown",
};

/**
 * The interactive demo: the real raster, a brush-value picker, and
 * undo/redo/reset wired through `EditSession<OccupancyDocument>`.
 */
function RasterLayerDemo({ initialBrush }: { readonly initialBrush: OccupancyValue }) {
  const decoded = useDecodedRaster(CUC_1_NORTH_RASTER.dataUri);
  const [session, setSession] = useState<EditSession<OccupancyDocument> | null>(null);
  const [brushValue, setBrushValue] = useState<OccupancyValue>(initialBrush);

  useEffect(() => {
    if (decoded !== null && session === null) {
      setSession(beginSession(decoded));
    }
  }, [decoded, session]);

  const handlePaint = useCallback((next: OccupancyDocument) => {
    setSession((current) => (current === null ? current : commitEdit(current, next)));
  }, []);

  if (session === null) {
    return (
      <div style={viewportBox}>
        <p style={hint}>Decoding the cuc_1_north raster…</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <ButtonRow>
        {(Object.keys(BRUSH_LABEL) as OccupancyValue[]).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={value === brushValue ? "primary" : "secondary"}
            onClick={() => {
              setBrushValue(value);
            }}
          >
            {BRUSH_LABEL[value]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={!canUndo(session)}
          onClick={() => {
            setSession((current) => (current === null ? current : undoEdit(current)));
          }}
        >
          Undo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!canRedo(session)}
          onClick={() => {
            setSession((current) => (current === null ? current : redoEdit(current)));
          }}
        >
          Redo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSession(beginSession(session.base));
          }}
        >
          Reset
        </Button>
      </ButtonRow>
      <div style={viewportBox}>
        <MapCanvas
          frame={FRAME}
          picture={(slot) => (
            <MapRasterLayer
              {...slot}
              document={session.current}
              onPaint={handlePaint}
              brushRadiusCells={BRUSH_RADIUS_CELLS}
              brushValue={brushValue}
            />
          )}
        >
          {() => null}
        </MapCanvas>
      </div>
      <p style={hint}>
        Painting <strong>{BRUSH_LABEL[brushValue]}</strong> — drag across the picture to paint the
        occupancy grid&apos;s own pixels. One drag is one undo step, however many samples the pointer
        reported.
      </p>
    </div>
  );
}

const meta = {
  title: "MapCanvas/RasterLayer",
  component: RasterLayerDemo,
  tags: ["autodocs"],
} satisfies Meta<typeof RasterLayerDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PaintOccupied: Story = {
  args: { initialBrush: "occupied" },
};

export const PaintFree: Story = {
  args: { initialBrush: "free" },
};

export const PaintUnknown: Story = {
  args: { initialBrush: "unknown" },
};
