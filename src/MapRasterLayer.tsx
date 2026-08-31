/**
 * @file `<MapRasterLayer/>` — an {@link OccupancyDocument} drawn to a
 * `<canvas>`, paintable there directly by dragging a brush across it.
 *
 * This is the answer to "the map picture itself cannot be edited": every
 * other surface in this library composes AFFORDANCES on top of a raster
 * (`Edit*` handles, road-graph vertices) but never changes the raster's own
 * pixels. This component does — it owns one `<canvas>`, redraws it from an
 * {@link OccupancyDocument} whenever that document changes, and turns a
 * pointer drag across it into {@link paintDab}/{@link paintStroke} calls from
 * `./map-canvas/raster-edit`, which is where every rule about what a pixel
 * MEANS and how a brush covers a fast drag without gaps actually lives —
 * this file only wires DOM events to that kernel and repaints a canvas.
 *
 * ## Composing with `<MapCanvas/>`
 *
 * `<MapCanvas/>` draws a plain `<img src>` as its picture by default; this
 * component is what a caller hands its `picture` render prop instead, to
 * make that picture paintable:
 *
 * ```tsx
 * <MapCanvas frame={frame} picture={(slot) => (
 *   <MapRasterLayer {...slot} document={document} onPaint={setDocument}
 *     brushRadiusCells={4} brushValue="occupied" />
 * )}>
 *   {(geometry) => ...}
 * </MapCanvas>
 * ```
 *
 * `{...slot}` is what makes this the SAME element MapCanvas's own `<img>`
 * would have been: the `attach` ref (so `toWorld` and pan/zoom hit-testing
 * work), the drawn-size `style`, and the `surfaceProps` a different editing
 * grammar composed onto the canvas would need. This component also stands on
 * its own with none of that — see `MapRasterLayer.stories.tsx` — sized by
 * `widthPx`/`heightPx` instead.
 *
 * ## Commit granularity: one call per STROKE, not per pointer sample
 *
 * `raster-edit.ts`'s document is shaped to be `EditSession<D>`'s `D`
 * (`../direct-manipulation/session.ts`), and `commitEdit` pushes one entry
 * per call — so if this component called `onPaint` on every `pointermove` a
 * single drag would fill the undo stack with dozens of nearly-identical
 * entries, and one undo would barely move the picture. Instead the whole
 * drag is painted into a LOCAL working document (`strokeRef`, canvas-only,
 * never handed to the caller) and {@link MapRasterLayerProps.onPaint} fires
 * exactly once, on release, with the finished result — the same granularity
 * a caller wiring this to `commitEdit` would want: one stroke, one undo step.
 *
 * Pure kernel, DOM host: this file is intentionally NOT in
 * `./map-canvas/raster-edit.ts` and does not re-implement any of its rules.
 */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  paintDab,
  paintStroke,
  type BrushShape,
  type CellPoint,
  type OccupancyDocument,
  type OccupancyValue,
} from "./map-canvas";
import styles from "./MapRasterLayer.module.css";

export type MapRasterLayerProps = {
  /** The document to draw and paint. */
  readonly document: OccupancyDocument;
  /**
   * Fired once per finished stroke (pointer release), with the document as
   * the whole stroke leaves it. Never fired per pointer sample — see the
   * file header ("Commit granularity").
   */
  readonly onPaint: (next: OccupancyDocument) => void;
  /** The brush's radius, in document cells. Forwarded to `paintDab`/`paintStroke`, which refuse zero or negative. */
  readonly brushRadiusCells: number;
  /** The vocabulary value the brush paints. */
  readonly brushValue: OccupancyValue;
  /** The brush's stamp shape. Defaults to "disc". */
  readonly brushShape?: BrushShape;
  /** When true, painting and the brush cursor are both switched off; the picture still redraws. */
  readonly disabled?: boolean;
  /**
   * The element's drawn (CSS-pixel) width, for standalone use. Defaults to
   * the document's own pixel width (1 CSS pixel per cell). A `picture` slot
   * from `<MapCanvas/>` overrides this via `widthPx` below.
   */
  readonly widthPx?: number;
  /** The element's drawn (CSS-pixel) height. Defaults to the document's own pixel height. */
  readonly heightPx?: number;
  /**
   * Ref callback for the root element — what `{...slot}` from
   * `<MapCanvas picture>` supplies as `attach`. Optional: a standalone use
   * has nothing else that needs this element's rect.
   */
  readonly attach?: (element: HTMLElement | null) => void;
  /** Extra inline style for the root element, merged UNDER the layer's own sizing (which always wins — see `<MapCanvas/>`'s own picture for why). */
  readonly style?: CSSProperties;
  /**
   * Extra props spread onto the root element — what a `picture` slot's
   * `surfaceProps` supplies. `style` is typed explicitly (rather than folded
   * into the index signature) so it can be merged with this layer's own
   * sizing instead of spread as an opaque value.
   */
  readonly surfaceProps?: { readonly style?: CSSProperties; readonly [key: string]: unknown };
  readonly className?: string;
};

/** `data-brush-shape` class lookup, so the cursor ring's corners match the stamp's. */
function cursorShapeClass(shape: BrushShape): string {
  return shape === "square" ? styles.cursorSquare! : styles.cursorDisc!;
}

/** `data-brush-value` class lookup for the cursor ring's colour register. */
function cursorValueClass(value: OccupancyValue): string {
  if (value === "occupied") {
    return styles.cursorOccupied!;
  }
  if (value === "free") {
    return styles.cursorFree!;
  }
  return styles.cursorUnknown!;
}

/** A stroke in progress: the pointer driving it, the last cell it touched, and the working document. */
type ActiveStroke = {
  readonly pointerId: number;
  lastCell: CellPoint;
  painting: OccupancyDocument;
};

/**
 * Whether THIS document can rasterise at all, asked once and remembered.
 *
 * Same reasoning as `readGrayscalePixels`'s `canvasRasterisationAvailable` in
 * robot-status-server-app: jsdom (where this component's own spec runs)
 * reports "not implemented" on `getContext("2d")` to its virtual console
 * every time it is asked, so asking once per redraw would print a complaint
 * per keystroke of a whole test suite for a capability that will never
 * change mid-document.
 */
let canvas2dKnown = false;
let canvas2dAvailable = false;
function canvasRasterisationAvailable(): boolean {
  if (!canvas2dKnown) {
    canvas2dKnown = true;
    canvas2dAvailable = window.document.createElement("canvas").getContext("2d") !== null;
  }
  return canvas2dAvailable;
}

/**
 * An occupancy document, drawn to a canvas and paintable by dragging a brush
 * across it.
 *
 * @param props See {@link MapRasterLayerProps}.
 * @returns The layer.
 */
export function MapRasterLayer({
  document,
  onPaint,
  brushRadiusCells,
  brushValue,
  brushShape = "disc",
  disabled = false,
  widthPx,
  heightPx,
  attach,
  style,
  surfaceProps,
  className,
}: MapRasterLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  // The just-finished stroke's result, kept visible until the CALLER's own
  // `document` prop catches up to it (see the file header's commit-once
  // rule and the effect below). Guards against a one-frame flicker back to
  // the pre-stroke picture if `onPaint`'s state update is not reflected in
  // the very next render this component receives.
  const pendingRef = useRef<OccupancyDocument | null>(null);
  const [hover, setHover] = useState<{ readonly x: number; readonly y: number } | null>(null);
  // Bumped on every local paint so the draw effect below re-runs even though
  // `activeStrokeRef`/`pendingRef` are refs, not state — the canvas is
  // painted imperatively, not through a value React would otherwise diff.
  const [renderTick, setRenderTick] = useState(0);

  // Once the caller's own `document` prop reflects a just-finished stroke,
  // stop shadowing it. Runs on every `document` change, not just a matching
  // one: if the caller's state diverged for some other reason (an external
  // undo arriving before this stroke's own update was applied), the pending
  // shadow must not keep masking it either.
  if (pendingRef.current !== null && pendingRef.current !== document) {
    pendingRef.current = null;
  }

  const drawnWidth = widthPx ?? document.width;
  const drawnHeight = heightPx ?? document.height;
  const pxPerCellX = drawnWidth / document.width;
  const pxPerCellY = drawnHeight / document.height;

  const cellFromClient = useCallback(
    (clientX: number, clientY: number): CellPoint | null => {
      const canvas = canvasRef.current;
      if (canvas === null) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      // Deliberately NOT bounds-checked against [0, width) here — a drag
      // that runs past the picture's edge should still paint up to the
      // edge, and `stampIndices` inside `raster-edit.ts` already clips a
      // stamp to the document's bounds. Refusing an out-of-box coordinate
      // here would just stop the stroke short instead.
      return {
        col: ((clientX - rect.left) / rect.width) * document.width,
        row: ((clientY - rect.top) / rect.height) * document.height,
      };
    },
    [document.width, document.height],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled) {
        return;
      }
      const cell = cellFromClient(event.clientX, event.clientY);
      if (cell === null) {
        return;
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const base = pendingRef.current ?? document;
      activeStrokeRef.current = {
        pointerId: event.pointerId,
        lastCell: cell,
        painting: paintDab(base, cell, brushRadiusCells, brushValue, brushShape),
      };
      setRenderTick((tick) => tick + 1);
    },
    [disabled, cellFromClient, document, brushRadiusCells, brushValue, brushShape],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      setHover(rect === undefined ? null : { x: event.clientX - rect.left, y: event.clientY - rect.top });
      const stroke = activeStrokeRef.current;
      if (stroke === null || stroke.pointerId !== event.pointerId) {
        return;
      }
      const cell = cellFromClient(event.clientX, event.clientY);
      if (cell === null) {
        return;
      }
      stroke.painting = paintStroke(stroke.painting, stroke.lastCell, cell, brushRadiusCells, brushValue, brushShape);
      stroke.lastCell = cell;
      setRenderTick((tick) => tick + 1);
    },
    [cellFromClient, brushRadiusCells, brushValue, brushShape],
  );

  const finishStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const stroke = activeStrokeRef.current;
      if (stroke === null || stroke.pointerId !== event.pointerId) {
        return;
      }
      activeStrokeRef.current = null;
      pendingRef.current = stroke.painting;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId) ?? false) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
      onPaint(stroke.painting);
      setRenderTick((tick) => tick + 1);
    },
    [onPaint],
  );

  const handlePointerLeave = useCallback(() => {
    setHover(null);
  }, []);

  // ---- draw ----------------------------------------------------------
  const displayDocument = activeStrokeRef.current?.painting ?? pendingRef.current ?? document;
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || !canvasRasterisationAvailable()) {
      // No 2D canvas (jsdom, where this component's own spec runs; a browser
      // with canvas disabled does the same) — nothing to draw. Matches the
      // documented posture `readGrayscalePixels` in
      // robot-status-server-app's SceneEditorCanvas takes for the same gap:
      // a missing capability is not an error to throw over.
      return;
    }
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }
    const { width, height, pixels } = displayDocument;
    const imageData = context.createImageData(width, height);
    for (let index = 0; index < pixels.length; index += 1) {
      const value = pixels[index] ?? 0;
      const offset = index * 4;
      imageData.data[offset] = value;
      imageData.data[offset + 1] = value;
      imageData.data[offset + 2] = value;
      imageData.data[offset + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `renderTick` is the signal; `displayDocument` is derived from refs a dependency array cannot see change.
  }, [displayDocument, renderTick]);

  const cursorDiameterX = brushRadiusCells * 2 * pxPerCellX;
  const cursorDiameterY = brushRadiusCells * 2 * pxPerCellY;

  const { style: extraStyle, ...surfaceRest } = surfaceProps ?? {};

  return (
    <div
      ref={attach}
      className={className === undefined ? styles.root : `${styles.root} ${className}`}
      data-map-raster-layer="true"
      style={{ width: `${String(drawnWidth)}px`, height: `${String(drawnHeight)}px`, ...style, ...extraStyle }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={document.width}
        height={document.height}
        aria-hidden="true"
        data-map-raster-layer-canvas="true"
        data-disabled={disabled ? "true" : undefined}
        {...surfaceRest}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={handlePointerLeave}
      />
      {disabled || hover === null ? null : (
        <div
          className={`${styles.cursor} ${cursorShapeClass(brushShape)} ${cursorValueClass(brushValue)}`}
          data-map-raster-layer-cursor="true"
          style={{
            left: `${String(hover.x)}px`,
            top: `${String(hover.y)}px`,
            width: `${String(cursorDiameterX)}px`,
            height: `${String(cursorDiameterY)}px`,
          }}
        />
      )}
    </div>
  );
}
