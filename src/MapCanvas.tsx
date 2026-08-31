/**
 * @file `<MapCanvas/>` — an occupancy raster, an SVG overlay in the raster's
 * own pixel space, and the viewport an operator moves both around in.
 *
 * This component is PRESENTATIONAL and editing-agnostic. It owns the picture,
 * the transform, and the two navigation gestures every map surface needs
 * (wheel-zoom at the cursor, drag-to-pan). It knows nothing about handles,
 * selections, intents or undo: the editing grammar composes ON TOP of it, by
 * spreading `useDirectEditSurface`'s `surfaceProps` onto the raster through
 * {@link MapCanvasProps.surfaceProps} and drawing its affordances as the
 * overlay's children. `MapCanvasEditor.stories.tsx` is that composition in
 * full; `MapCanvas.stories.tsx` is this component with no editing at all, and
 * the fact that the second one exists without importing a single symbol from
 * `direct-manipulation` is what the separation is for.
 *
 * ## The seam: a RENDER PROP, not a context
 *
 * Children receive the live geometry ({@link MapCanvasGeometry}) as a call
 * argument rather than through a React context, for four reasons:
 *
 *  - The geometry changes on every frame of a pan or zoom. A context would
 *    re-render every subscriber on each of those frames anyway, so it buys no
 *    render economy — it only hides where the dependency is.
 *  - There is exactly ONE structural child slot here (the contents of the
 *    overlay `<svg>`), not an arbitrary subtree. Context's distinguishing
 *    property is reaching a descendant nobody threaded a prop through, and
 *    nothing here is more than one level deep.
 *  - A context makes the canvas an ambient API: any descendant could start
 *    reading map geometry, and this layer's whole claim is that it stays
 *    presentational.
 *  - A provider is a second thing that can be missing. A render prop cannot
 *    be forgotten — the type will not let the caller omit it.
 *
 * ## How a consumer gets `toWorld` BEFORE it renders
 *
 * `useDirectEditSurface` needs a `toWorld` at hook-call time, which is before
 * any render prop has run. That is what {@link useMapCanvasProjector} is for:
 * the consumer calls it, passes the result back in as
 * {@link MapCanvasProps.projector}, and the canvas attaches it to the image it
 * owns. There is therefore still exactly ONE implementation of
 * client-position-to-world ({@link worldPointFromClient}) and exactly one
 * element whose live rectangle answers it — the alternative, letting the
 * consumer re-derive the conversion from an element ref, is two pieces of
 * arithmetic that can disagree about where the pointer was.
 *
 * ## Why the zoom is a LAYOUT size and only the pan is a transform
 *
 * The obvious arrangement — one CSS `translate(pan) scale(zoom)` on the stack
 * that holds the image and the overlay — is the one this component started
 * with, and it is wrong in exactly one respect, measurably:
 *
 * A `scale()` on an ANCESTOR of the overlay `<svg>` leaves the SVG's own
 * viewBox-to-viewport mapping at identity, and Blink cancels a
 * `vector-effect: non-scaling-stroke` against that inner mapping ALONE. So
 * every stroke in the overlay was painted `declared * zoom` screen pixels
 * wide no matter how loudly `MapCanvas.module.css` declared otherwise: at
 * 12.6x a handle's 2-unit outline was painted 25 px, wider than the 25.9 px
 * handle it outlines. Measured in Chromium, both arrangements, in
 * `spec/map-canvas.e2e.spec.ts`:
 *
 * ```text
 *                        geometry (stroke excluded)   painted stroke
 *   ancestor transform   25.875 px at every zoom      1.70 / 6.56 / 25.29 px
 *   layout size          25.875 px at every zoom      2.00 / 2.00 /  2.00 px
 * ```
 *
 * So the zoom is applied as a SIZE: the stack, the image and the overlay are
 * all laid out at `pixel size * zoom`, the overlay keeps `viewBox` = the
 * raster's own pixel box, and the transform carries the pan alone. The zoom
 * is then inside the SVG's viewBox mapping, which is the mapping the stroke
 * cancellation is defined against, and every `Edit*` fragment's declared
 * weight (2, 1.5, 2.5) is painted at that many screen pixels and stays
 * distinguishable from the others. Nothing else changes: a viewBox mapping
 * and a `scale()` scale the drawn geometry by the identical factor, so the
 * counter-scaled radii, the projection, the pointer conversion and every
 * formula in `map-canvas/viewport.ts` (all written for an origin at the
 * top-left, which a translate-only transform still honours) are untouched.
 *
 * `fitToBox` returns a content-pixel-to-CSS-pixel ratio, and that ratio is
 * only the zoom actually applied when the image is drawn at its pixel size
 * times the zoom and nothing else resizes it — so the stylesheet still never
 * makes the image responsive, and the `width`/`height` ATTRIBUTES stay the
 * frame's own numbers (the intrinsic size, and the box reserved before the
 * raster decodes) while the drawn size is stated in CSS beside them. The
 * payoff is unchanged: `rasterUnitsPerScreenPixel` is exact and known without
 * measuring anything, because this component SET the drawn width rather than
 * reading `offsetWidth` back and hoping the browser has laid out. That is
 * also why {@link MapCanvasGeometry.scale} is a number and not
 * `number | null` — the "not measured yet" case the kernel reports with
 * `null` cannot arise here.
 *
 * ## a11y
 *
 * The surface adds no `role`, no `tabIndex` and no `aria-*` of its own: it is
 * a picture with decorative SVG over it, and keyboard reachability is the
 * consumer's NATIVE TWIN — a real list and real buttons beside the canvas
 * (see `MapCanvasEditor.stories.tsx`). The overlay `<svg>` is `aria-hidden`
 * for the same reason every `Edit*` fragment's group is: it restates, in
 * pictures, what the twin already says in text.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  FITTED_VIEWPORT,
  fitToBox,
  metresPerScreenPixel,
  panBy,
  project,
  rasterUnitsPerScreenPixel,
  unproject,
  wheelZoom,
  zoomAbout,
  type MapViewport,
  type RasterFrame,
  type RasterPoint,
  type WorldPoint,
} from "./map-canvas";
import { pressSlopPx } from "./direct-manipulation/constants";
import styles from "./MapCanvas.module.css";

/**
 * The pointer props an editing consumer spreads onto the raster.
 *
 * Declared structurally rather than imported as
 * `DirectEditSurface["surfaceProps"]` so this presentational component
 * carries no type dependency on the editing kernel at all: a consumer with a
 * different pointer layer can hand over its own object of the same shape, and
 * the direct-manipulation one satisfies this by structure.
 */
export type MapCanvasSurfaceProps = {
  /**
   * The editing layer's own inline style — its cursor, above all. It is
   * MERGED over the raster's, never a replacement: the picture's white
   * backing is a fact about the occupancy grid, not a style the pointer layer
   * gets a say in.
   */
  readonly style?: CSSProperties;
  readonly [key: string]: unknown;
};

/** The gesture modifiers a background-press decision may consult. */
export type MapCanvasPressModifiers = {
  readonly shift: boolean;
};

/** The live geometry of the drawn map, handed to the overlay's children. */
export type MapCanvasGeometry = {
  /** The raster's placement in the world. */
  readonly frame: RasterFrame;
  /** How far in the operator has zoomed, and where they pushed the picture. */
  readonly viewport: MapViewport;
  /**
   * RASTER UNITS PER SCREEN PIXEL — the counter-scale.
   *
   * The overlay is drawn in the raster's pixel space, so an affordance that
   * must stay a constant SIZE ON SCREEN is drawn with its pixel radius
   * MULTIPLIED by this. At zoom 2 one raster unit is two screen pixels, so
   * this is 0.5 and a 9 px handle is drawn 4.5 raster units across — still
   * nine screen pixels. Forgetting the multiplication is what makes handles
   * balloon when an operator zooms in.
   */
  readonly scale: number;
  /**
   * World units (metres) per screen pixel — the same statement in the form
   * `direct-manipulation`'s `toleranceMetres(metresPerPixel, radiusPx,
   * fallbackM)` consumes, so a pick tolerance stays a constant number of
   * screen pixels too.
   */
  readonly metresPerScreenPixel: number;
  /** World position to the raster pixel it falls on (the drawing frame). */
  readonly project: (at: WorldPoint) => RasterPoint;
  /** The exact inverse of {@link MapCanvasGeometry.project}. */
  readonly unproject: (at: RasterPoint) => WorldPoint;
  /** A client pointer position to a world position, or null when off the raster. */
  readonly toWorld: (clientX: number, clientY: number) => WorldPoint | null;
};

export type MapCanvasProps = {
  /** The raster's placement in the world. */
  readonly frame: RasterFrame;
  /** The raster image's URL — a data URI is as good as any other. */
  readonly src: string;
  /** The picture's own text alternative. Required: an unnamed map is not one. */
  readonly alt: string;
  /**
   * The viewport, when the CONSUMER owns it.
   *
   * A consumer that must know the zoom before it renders — an editor sizing
   * its pick tolerances, for instance — has to hold this state itself.
   * Passing it REQUIRES `onViewportChange`: a viewport prop with no way to
   * change it is a canvas whose gestures are silently discarded, which this
   * component refuses rather than degrades into.
   */
  readonly viewport?: MapViewport;
  /** Report a viewport the operator's gesture arrived at. */
  readonly onViewportChange?: (viewport: MapViewport) => void;
  /**
   * Refit the picture to the box when this value CHANGES.
   *
   * A counter and not a boolean, because "fit it again" asked twice in a row
   * is two requests: a prop that compares equal would answer only the first.
   * The first measurement always fits, whatever this holds.
   */
  readonly fitNonce?: number;
  /**
   * The projector whose `toWorld` the consumer already handed to its pointer
   * layer. Omitted, the canvas makes its own — which is all a non-editing
   * consumer needs.
   */
  readonly projector?: MapCanvasProjector;
  /** An editing layer's pointer props, spread onto the raster. */
  readonly surfaceProps?: MapCanvasSurfaceProps;
  /**
   * Whether a PRIMARY press at this position would take no grip on the
   * consumer's document, and may therefore pan the picture.
   *
   * Omitted, every primary press pans: a canvas with no editing layer has
   * nothing else for one to mean. An editing consumer answers from its own
   * grammar, so that a press on a handle drags the handle and a press on
   * empty floor drags the map. The middle button pans regardless — no editing
   * grammar in this suite gives a wheel press another meaning.
   */
  readonly isBackgroundPress?: (
    clientX: number,
    clientY: number,
    modifiers: MapCanvasPressModifiers,
  ) => boolean;
  /** Extra class on the viewport box, for the host's own sizing. */
  readonly className?: string;
  /** The overlay's contents, drawn in the raster's own pixel space. */
  readonly children: (geometry: MapCanvasGeometry) => ReactNode;
};

/**
 * The world position under a client pointer position, for a raster drawn at
 * `rect`.
 *
 * The rectangle is the IMAGE's live one, so a zoomed or panned viewport needs
 * no arithmetic here: a CSS transform moves and scales that rectangle, and
 * this conversion is proportional within it. That is the whole reason the
 * viewport is one transform and not a second projection.
 *
 * @param frame The raster's placement in the world.
 * @param rect The image's live bounding rectangle.
 * @param clientX The pointer's client x.
 * @param clientY The pointer's client y.
 * @returns The world position, or null when the pointer is off the picture
 *   (including when the image has no laid-out box at all).
 */
export function worldPointFromClient(
  frame: RasterFrame,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
): WorldPoint | null {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    clientX < rect.left ||
    clientX > rect.left + rect.width ||
    clientY < rect.top ||
    clientY > rect.top + rect.height
  ) {
    return null;
  }
  return unproject(frame, {
    col: ((clientX - rect.left) / rect.width) * frame.pixelWidth,
    row: ((clientY - rect.top) / rect.height) * frame.pixelHeight,
  });
}

/**
 * A stable client-position-to-world conversion bound to the raster element a
 * {@link MapCanvas} owns.
 *
 * Exists because of an ordering problem with no way around it: a pointer
 * layer such as `useDirectEditSurface` is constructed in the consumer's own
 * body and REQUIRES a `toWorld` there, which is strictly before any render
 * prop of the canvas below it has run. The consumer calls this, hands the
 * result to its pointer layer AND to {@link MapCanvasProps.projector}, and
 * the canvas attaches the element.
 *
 * @param frame The raster's placement in the world.
 * @returns The projector to pass to {@link MapCanvas}.
 */
export function useMapCanvasProjector(frame: RasterFrame): MapCanvasProjector {
  const elementRef = useRef<HTMLImageElement | null>(null);
  const attach = useCallback((element: HTMLImageElement | null) => {
    elementRef.current = element;
  }, []);
  const toWorld = useCallback(
    (clientX: number, clientY: number): WorldPoint | null => {
      const element = elementRef.current;
      if (element === null) {
        return null;
      }
      return worldPointFromClient(frame, element.getBoundingClientRect(), clientX, clientY);
    },
    [frame],
  );
  return useMemo(() => ({ attach, toWorld }), [attach, toWorld]);
}

/** A client-position-to-world conversion bound to one canvas's raster element. */
export type MapCanvasProjector = {
  /** Ref callback for the raster image. {@link MapCanvas} calls it. */
  readonly attach: (element: HTMLImageElement | null) => void;
  /** The pointer conversion, stable for as long as the frame is. */
  readonly toWorld: (clientX: number, clientY: number) => WorldPoint | null;
};

/** The pointer button that pans on every posture: the wheel press. */
const MIDDLE_BUTTON = 1;

/** The pointer button that edits, and that pans where it grips nothing. */
const PRIMARY_BUTTON = 0;

/**
 * A pan in progress, or the press that may yet become one.
 *
 * The `live` flag is the whole of why a plain drag can pan without costing an
 * editing consumer a gesture. A WHEEL press is a pan from its first pixel. A
 * PRIMARY press over empty raster is only a CANDIDATE — the same press still
 * means "deselect" or "place a point" if it is released without travelling —
 * so it moves nothing until it passes the editing grammar's own
 * press-versus-drag threshold, and the press itself reaches the surface
 * either way.
 */
type PanGesture = {
  readonly pointerId: number;
  /** Where the press landed, in client space. The threshold is measured here. */
  readonly downX: number;
  readonly downY: number;
  /** The last position a displacement was taken from. */
  clientX: number;
  clientY: number;
  /** Whether the gesture has become a drag and is moving the picture. */
  live: boolean;
};

/** Every primary press pans, for a canvas with no editing layer to say otherwise. */
function everyPressIsBackground(): boolean {
  return true;
}

/**
 * The raster, the overlay drawn in its pixel space, and the viewport that
 * moves both.
 *
 * @param props See {@link MapCanvasProps}.
 * @returns The canvas.
 * @throws Error When `viewport` is supplied without `onViewportChange`.
 */
export function MapCanvas({
  frame,
  src,
  alt,
  viewport: controlledViewport,
  onViewportChange,
  fitNonce,
  projector,
  surfaceProps,
  isBackgroundPress = everyPressIsBackground,
  className,
  children,
}: MapCanvasProps): ReactNode {
  if (controlledViewport !== undefined && onViewportChange === undefined) {
    throw new Error(
      "MapCanvas: a controlled `viewport` requires `onViewportChange`. Without it every " +
        "wheel, pan and fit the operator performs would be computed and then discarded, and " +
        "the canvas would look broken rather than say so.",
    );
  }

  const [uncontrolledViewport, setUncontrolledViewport] = useState<MapViewport>(FITTED_VIEWPORT);
  const viewport = controlledViewport ?? uncontrolledViewport;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<PanGesture | null>(null);
  const [panning, setPanning] = useState(false);
  const ownProjector = useMapCanvasProjector(frame);
  const activeProjector = projector ?? ownProjector;

  // The latest viewport, readable by a pointer handler that cannot wait for a
  // render: two wheel notches inside one frame must compose, and a controlled
  // consumer's prop has not come back yet when the second one arrives.
  const viewportRef = useRef<MapViewport>(viewport);
  viewportRef.current = viewport;
  const reportRef = useRef<((next: MapViewport) => void) | undefined>(onViewportChange);
  reportRef.current = onViewportChange;

  const applyViewport = useCallback((next: (current: MapViewport) => MapViewport) => {
    const current = viewportRef.current;
    const updated = next(current);
    if (updated === current) {
      return;
    }
    viewportRef.current = updated;
    const report = reportRef.current;
    if (report === undefined) {
      setUncontrolledViewport(updated);
      return;
    }
    report(updated);
  }, []);

  const boxPointOf = useCallback((clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  // ---- fit ---------------------------------------------------------------
  // The first measurement fits, and every change of `fitNonce` fits again. A
  // box with no laid-out size is NOT fitted to: `fitToBox` refuses a
  // non-positive dimension outright, and jsdom (where this component's spec
  // runs) never lays anything out. `fitNonce` is the retry for a host whose
  // box is sized after this effect runs.
  const frameWidth = frame.pixelWidth;
  const frameHeight = frame.pixelHeight;
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box === null) {
      return;
    }
    const width = box.clientWidth;
    const height = box.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }
    applyViewport(() => fitToBox({ width: frameWidth, height: frameHeight }, { width, height }));
  }, [applyViewport, frameWidth, frameHeight, fitNonce]);

  // ---- wheel -------------------------------------------------------------
  // Attached by hand because React registers `wheel` as a PASSIVE listener at
  // the root, where `preventDefault` is ignored — and a zoom that also
  // scrolled the page under the operator's pointer is not a zoom. This is the
  // one place in this file that touches the DOM's event API directly.
  const wheelRef = useRef<(event: WheelEvent) => void>(() => undefined);
  wheelRef.current = (event: WheelEvent) => {
    event.preventDefault();
    applyViewport((current) =>
      zoomAbout(current, wheelZoom(current, event.deltaY), boxPointOf(event.clientX, event.clientY)),
    );
  };
  useEffect(() => {
    const box = boxRef.current;
    if (box === null) {
      return;
    }
    const listener = (event: WheelEvent) => {
      wheelRef.current(event);
    };
    box.addEventListener("wheel", listener, { passive: false });
    return () => {
      box.removeEventListener("wheel", listener);
    };
  }, []);

  // ---- pan ---------------------------------------------------------------
  const startPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = panRef.current;
      if (current !== null) {
        if (current.live || current.pointerId === event.pointerId) {
          return;
        }
        // A candidate left over from a press whose release was never
        // delivered. A candidate holds no pointer capture — it is not a drag
        // yet — so it can be let go of outside this box and hear nothing
        // about it, and one stale one would lock the viewport out of every
        // later gesture.
        panRef.current = null;
      }
      const at = {
        downX: event.clientX,
        downY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (event.button === MIDDLE_BUTTON) {
        event.stopPropagation();
        // Optional calls: the pointer-capture family is absent in jsdom, and
        // a pan works without it (the gesture ends on the first pointerup
        // either way).
        event.currentTarget.setPointerCapture?.(event.pointerId);
        panRef.current = { pointerId: event.pointerId, ...at, live: true };
        setPanning(true);
        return;
      }
      if (
        event.button !== PRIMARY_BUTTON ||
        !isBackgroundPress(event.clientX, event.clientY, { shift: event.shiftKey })
      ) {
        return;
      }
      panRef.current = { pointerId: event.pointerId, ...at, live: false };
    },
    [isBackgroundPress],
  );

  const continuePan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panRef.current;
    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return;
    }
    if (!gesture.live) {
      // The pan takes no grip on any document, so its threshold is the
      // editing grammar's PRESS slop — the shared table's answer for a press
      // that grabbed nothing. The modality comes from the event, since a pan
      // begins under a finger as readily as under a mouse.
      const slop = pressSlopPx(event.pointerType === "touch" ? "coarse" : "fine");
      if (Math.hypot(event.clientX - gesture.downX, event.clientY - gesture.downY) <= slop) {
        return;
      }
      gesture.live = true;
      setPanning(true);
      // Capture is taken HERE and not at the press. It re-targets every later
      // pointer event at this box, so an editing surface below would never
      // see the release — and a release it does not see is a click that does
      // not happen. Past the slop there is no click left to protect.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.stopPropagation();
    const dx = event.clientX - gesture.clientX;
    const dy = event.clientY - gesture.clientY;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    applyViewport((current) => panBy(current, dx, dy));
  }, [applyViewport]);

  const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panRef.current;
    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return;
    }
    panRef.current = null;
    if (gesture.live) {
      // Only a gesture that actually moved the picture swallows its own
      // release; a candidate that never moved hands it on, and the editing
      // layer's click happens exactly as it would have without any of this.
      event.stopPropagation();
      setPanning(false);
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId) ?? false) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }, []);

  /**
   * A press that left the map before it became a drag is not one. A live pan
   * holds pointer capture and hears its own release wherever it happens; a
   * candidate holds none, so this is where one that wandered off is let go.
   */
  const abandonCandidate = useCallback(() => {
    if (panRef.current?.live === false) {
      panRef.current = null;
    }
  }, []);

  // ---- geometry ----------------------------------------------------------
  // `frame.pixelWidth` and the zoom are passed separately, not as the drawn
  // width and 1, and not as `offsetWidth`: the kernel multiplies them, and
  // that product is exactly the width this component writes into the picture
  // below (see the file header). Both kernel calls therefore answer a real
  // measurement and neither can return the kernel's "not laid out yet" null.
  const geometry = useMemo<MapCanvasGeometry>(() => {
    const scale = rasterUnitsPerScreenPixel(frame, frame.pixelWidth, viewport.zoom);
    const metres = metresPerScreenPixel(frame, frame.pixelWidth, viewport.zoom);
    if (scale === null || metres === null) {
      throw new Error(
        "MapCanvas: the raster reported no drawn scale, which cannot happen for a frame with " +
          "a positive pixelWidth. Either the frame is degenerate or the viewport kernel " +
          "changed under this component.",
      );
    }
    return {
      frame,
      viewport,
      scale,
      metresPerScreenPixel: metres,
      project: (at: WorldPoint) => project(frame, at),
      unproject: (at: RasterPoint) => unproject(frame, at),
      toWorld: activeProjector.toWorld,
    };
  }, [frame, viewport, activeProjector]);

  const { style: surfaceStyle, ...surfaceRest } = surfaceProps ?? {};

  // ---- where the zoom is applied -----------------------------------------
  // The zoom is a LAYOUT size and only the pan is a transform. See the file
  // header ("Why the zoom is a layout size"): a `scale()` on this element
  // leaves the overlay `<svg>`'s own CTM at identity, and Blink cancels a
  // `non-scaling-stroke` against that CTM alone — so every stroke in the
  // overlay was painted `declared * zoom` screen pixels wide however loudly
  // the stylesheet declared otherwise. Sizing the stack (and with it the
  // image and the overlay, which fill it) to the DRAWN size puts the zoom
  // inside the SVG's viewBox mapping, where the stroke cancellation happens.
  const drawnWidthPx = frame.pixelWidth * viewport.zoom;
  const drawnHeightPx = frame.pixelHeight * viewport.zoom;
  const drawnSize: CSSProperties = {
    width: `${String(drawnWidthPx)}px`,
    height: `${String(drawnHeightPx)}px`,
  };
  const stackStyle: CSSProperties = {
    // `viewportTransform` writes `translate(pan) scale(zoom)`, which is the
    // arrangement this component no longer uses; the kernel keeps it for a
    // host that scales by transform and accepts what that costs its strokes.
    transform: `translate(${String(viewport.panX)}px, ${String(viewport.panY)}px)`,
    ...drawnSize,
  };

  return (
    <div
      ref={boxRef}
      className={className === undefined ? styles.box : `${styles.box} ${className}`}
      data-map-canvas="true"
      data-map-canvas-panning={panning ? "true" : undefined}
      onPointerDownCapture={startPan}
      onPointerMoveCapture={continuePan}
      onPointerUpCapture={endPan}
      onPointerCancelCapture={endPan}
      onPointerLeave={abandonCandidate}
    >
      <div className={styles.stack} data-map-canvas-stack="true" style={stackStyle}>
        <img
          ref={activeProjector.attach}
          className={styles.raster}
          src={src}
          alt={alt}
          width={frame.pixelWidth}
          height={frame.pixelHeight}
          draggable={false}
          data-map-canvas-raster="true"
          {...surfaceRest}
          // The occupancy grid is black-on-white and its transparent regions
          // mean UNKNOWN space rather than "whatever the page is", so the
          // picture needs its own white backing on a dark palette. It is the
          // one literal in this component, and it is the picture's own fact
          // rather than a colour choice a theme could restate.
          //
          // The DRAWN size is stated here in the same number the stack and
          // the overlay get, so the picture and the drawing cannot round to
          // two different boxes. It is written LAST — after the pointer
          // layer's style rather than before it — because it is not a style
          // an editing layer gets a say in: the image's rectangle is what
          // every pointer conversion on this surface divides by, so a
          // consumer that resized it would not restyle the canvas, it would
          // silently move the world under the operator's cursor.
          //
          // The `width`/`height` ATTRIBUTES stay the raster's natural pixel
          // box: they are the intrinsic size, and the aspect ratio the box
          // reserves before the image decodes.
          style={{ background: "#ffffff", ...surfaceStyle, ...drawnSize }}
        />
        <svg
          className={styles.overlay}
          viewBox={`0 0 ${String(frame.pixelWidth)} ${String(frame.pixelHeight)}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          data-map-canvas-overlay="true"
        >
          {children(geometry)}
        </svg>
      </div>
    </div>
  );
}
