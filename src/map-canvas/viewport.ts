/**
 * @file The map canvas's VIEWPORT: how far in the operator has zoomed, and
 * where they have pushed the picture, expressed as one affine transform.
 *
 * This is the pan/zoom kernel proven in `robot-status-server-app`'s
 * `scene-viewport.ts`, promoted here so every host that needs to edit a map
 * at map scale — a keep-out ring on a vendor SLAM raster, a hand-drawn region
 * on a nav-autonomy floor plan — shares one implementation instead of
 * re-deriving the same arithmetic behind three different bugs.
 *
 * ## Why a CSS transform, and not a second projection
 *
 * The whole viewport is meant to be applied as ONE transform —
 * `translate(pan) scale(zoom)`, transform-origin at the top-left — to the
 * element that holds the content (a raster image, an SVG overlay, or both).
 * Nothing downstream needs to know the zoom happened:
 *
 *  - A world ↔ raster-pixel projection (see `projection.ts`) stays in the
 *    content's own untransformed space. A zoomed canvas draws the same
 *    numbers; only the element they are drawn into has moved and scaled.
 *  - A pointer position becomes a content position through the transformed
 *    element's own LIVE bounding rectangle (owned by the host, not this
 *    module), so the conversion picks the transform up for free and cannot
 *    disagree with what is on screen.
 *  - Hit tolerances stated in content units shrink and grow with zoom for
 *    free, via `screen-scale.ts`'s counter-scale, because that too reads the
 *    same live rectangle.
 *
 * A second, zoom-aware projection would be a second thing that can disagree
 * with the first. There is none here.
 *
 * ## Why the zoom range is not rssa's 1..16
 *
 * rssa's `SceneViewport` treats `zoom: 1` as "the raster already fitted to
 * its panel" — the fit itself happens outside that module, in CSS layout, so
 * the viewport only ever scales UP from an already-visible picture and 1 is
 * a sound floor. This module has no such outside help: {@link fitToBox}
 * computes the actual content-pixel-to-CSS-pixel ratio needed to contain
 * arbitrary content in a box of any size, and that ratio is very often below
 * 1 — a scanned floor plan several thousand pixels across, dropped into a
 * panel a few hundred CSS pixels wide, needs a scale under 1 just to become
 * visible at all on first mount. Flooring at 1, as rssa does, would crop such
 * a map the moment it opens, which is precisely the failure this module
 * exists to promote a fix for. See {@link MIN_ZOOM} and {@link fitToBox} for
 * how the floor and the fit are kept from fighting each other.
 *
 * Pure functions and plain data: no React, no DOM, no clock.
 *
 * ## Where validation lives
 *
 * Only the functions that take a raw, untrusted number cross a real
 * boundary: {@link clampZoom} (an arbitrary requested zoom) and
 * {@link fitToBox} (raw content/box dimensions from layout). Both refuse a
 * non-finite or non-positive input outright rather than substitute a
 * plausible-looking default — the workspace's fail-first rule. The
 * composition functions ({@link contentPointAt}, {@link zoomAbout},
 * {@link panBy}) only ever receive a `MapViewport` or a `BoxPoint` that has
 * already crossed one of those boundaries, so they stay plain arithmetic
 * that trusts its inputs, the same way `direct-manipulation/geometry.ts`
 * trusts an already-constructed `Vertex`.
 */

/** How far in the operator has zoomed, and where they have pushed the picture. */
export type MapViewport = {
  /** Content-pixel-to-CSS-pixel scale factor. */
  readonly zoom: number;
  /** Horizontal offset in CSS pixels, applied before the scale. */
  readonly panX: number;
  /** Vertical offset in CSS pixels, applied before the scale. */
  readonly panY: number;
};

/** A position inside the viewport's own box, in CSS pixels from its top-left. */
export type BoxPoint = {
  readonly x: number;
  readonly y: number;
};

/** A width/height pair in CSS pixels (a box) or content pixels (content). */
export type Size = {
  readonly width: number;
  readonly height: number;
};

/**
 * The identity viewport: content drawn at its own native scale, pushed
 * nowhere.
 *
 * Unlike rssa's `FITTED_VIEWPORT`, this is NOT "the content fitted to a
 * box" — there is no single such state independent of what the content and
 * the box measure, which is exactly why {@link fitToBox} exists as a
 * function rather than a constant. This value is a safe placeholder for the
 * moment before a host knows either measurement (e.g. before an image has
 * decoded), not a claim that anything is fitted yet.
 */
export const FITTED_VIEWPORT: MapViewport = { zoom: 1, panX: 0, panY: 0 };

/**
 * The smallest INTERACTIVE zoom offered — the floor applied by
 * {@link clampZoom} (and therefore by {@link zoomAbout} and any wheel/button
 * gesture built on it).
 *
 * Deliberately below rssa's floor of 1, and deliberately NOT a floor on
 * {@link fitToBox}'s result (see that function's own doc for why). 0.1 means
 * an operator may zoom out until ten content pixels occupy one CSS pixel.
 * Past that the picture is a stamp: no feature is individually pickable with
 * a pointer, so a lower floor would only make the "zoomed all the way out"
 * gesture less predictable without buying back any usable range. It is a
 * round number, not a measurement, because — unlike rssa's ceiling below,
 * which is anchored to one real raster's resolution — this module serves
 * hosts whose content pixel scale is not fixed in advance.
 */
export const MIN_ZOOM = 0.1;

/**
 * The largest zoom offered.
 *
 * Sixteen, unchanged from rssa's reasoning even though this module's `zoom`
 * means something different in absolute terms (see the file header): past
 * sixteen, one content pixel already fills sixteen CSS pixels — larger than
 * every drawn affordance this suite's editors use — and a fixed-resolution
 * occupancy raster has no finer detail underneath a pixel to reveal by going
 * further. The physical statement ("a source pixel this big has nothing left
 * to show") is the same statement rssa was making; only the baseline it is
 * measured from changed.
 */
export const MAX_ZOOM = 16;

/** How much of a wheel notch's delta becomes zoom. Inherited from rssa's tuning. */
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

/**
 * A zoom inside the offered interactive range.
 *
 * Throws on a non-finite zoom rather than substitute {@link MIN_ZOOM}, which
 * is what rssa's twin does. A NaN or infinite zoom can only come from a
 * caller's own broken arithmetic (a division that should not have produced
 * zero, most likely) and silently resetting to the floor would show the
 * operator a viewport that quietly snapped to "zoomed all the way out"
 * instead of surfacing the bug that caused it — exactly the "plausible
 * default" the workspace's fail-first rule exists to forbid.
 *
 * @param zoom The wanted zoom.
 * @returns The zoom, clamped to [{@link MIN_ZOOM}, {@link MAX_ZOOM}].
 * @throws Error When `zoom` is not a finite number.
 */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    throw new Error(`clampZoom: zoom must be a finite number, got ${String(zoom)}`);
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * The content position under a point of the viewport's box.
 *
 * "Content" here is the untransformed layout the transform is applied TO.
 * Turning a box position into one is what lets a zoom keep whatever the
 * pointer was over exactly where it was — see {@link zoomAbout}.
 *
 * @param viewport The current viewport.
 * @param at Where in the box, in CSS pixels from its top-left corner.
 * @returns The content position, in untransformed CSS pixels.
 */
export function contentPointAt(viewport: MapViewport, at: BoxPoint): BoxPoint {
  return {
    x: (at.x - viewport.panX) / viewport.zoom,
    y: (at.y - viewport.panY) / viewport.zoom,
  };
}

/**
 * Zoom, keeping whatever is under one box position exactly where it is.
 *
 * This is the whole of "zoom about the cursor": the content position under
 * the pointer is worked out at the old zoom, and the pan is then chosen so
 * the same content position lands under the pointer at the new one. This is
 * the property that makes a pan/zoom surface feel navigable rather than
 * disorienting, and it is asserted numerically in this module's spec.
 *
 * @param viewport The current viewport.
 * @param zoom The wanted zoom, before clamping.
 * @param anchor The box position to hold still.
 * @returns The new viewport.
 * @throws Error When `zoom` is not a finite number (via {@link clampZoom}).
 */
export function zoomAbout(viewport: MapViewport, zoom: number, anchor: BoxPoint): MapViewport {
  const next = clampZoom(zoom);
  if (next === viewport.zoom) {
    return viewport;
  }
  const content = contentPointAt(viewport, anchor);
  return {
    zoom: next,
    panX: anchor.x - content.x * next,
    panY: anchor.y - content.y * next,
  };
}

/**
 * Push the picture by a screen-space displacement.
 *
 * @param viewport The current viewport.
 * @param dx Horizontal displacement in CSS pixels.
 * @param dy Vertical displacement in CSS pixels.
 * @returns The new viewport.
 */
export function panBy(viewport: MapViewport, dx: number, dy: number): MapViewport {
  if (dx === 0 && dy === 0) {
    return viewport;
  }
  return { ...viewport, panX: viewport.panX + dx, panY: viewport.panY + dy };
}

/**
 * The zoom one wheel event asks for, before clamping.
 *
 * Exponential in the wheel delta rather than additive, so one notch is the
 * same PROPORTIONAL step at every zoom: an additive step would crawl once
 * zoomed in far and jump once zoomed out far, because the same absolute
 * delta means a wildly different fraction of the current scale at each end
 * of the range. Multiplying by `exp(-deltaY * sensitivity)` makes the ratio
 * `wheelZoom(v, d) / v.zoom` independent of `v.zoom` — asserted in this
 * module's spec as the wheel-step-proportionality property.
 *
 * @param viewport The current viewport.
 * @param deltaY The wheel event's vertical delta.
 * @returns The wanted zoom, before clamping. Pass it to {@link zoomAbout}.
 */
export function wheelZoom(viewport: MapViewport, deltaY: number): number {
  return viewport.zoom * Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY);
}

/**
 * The CSS `transform` value for a viewport.
 *
 * Translate first and scale second, read left to right, so the pan is
 * stated in SCREEN pixels and is not itself multiplied by the zoom. Paired
 * with `transform-origin: 0 0` on the host's element, which is what makes
 * every formula in this module exact.
 *
 * @param viewport The viewport.
 * @returns The transform.
 */
export function viewportTransform(viewport: MapViewport): string {
  const x = String(viewport.panX);
  const y = String(viewport.panY);
  return `translate(${x}px, ${y}px) scale(${String(viewport.zoom)})`;
}

/**
 * Assert a size is usable geometry: positive and finite in both dimensions.
 *
 * @param size The size to check.
 * @param label Which argument this was, for the error message.
 * @throws Error When either dimension is not a positive finite number.
 */
function assertPositiveSize(size: Size, label: string): void {
  if (!Number.isFinite(size.width) || size.width <= 0) {
    throw new Error(`fitToBox: ${label}.width must be a positive finite number, got ${String(size.width)}`);
  }
  if (!Number.isFinite(size.height) || size.height <= 0) {
    throw new Error(`fitToBox: ${label}.height must be a positive finite number, got ${String(size.height)}`);
  }
}

/**
 * The viewport that fits `content` into `box`, centred, preserving aspect
 * ratio ("contain" fit — the whole of the content is visible, letterboxed on
 * the axis it does not fill).
 *
 * This is what makes a several-thousand-pixel-wide scanned floor plan
 * usable the moment a panel mounts: rssa has no equivalent of this function
 * because its layout already arrives fitted (see the file header), and a
 * caller reaching for `FITTED_VIEWPORT` here would get the wrong picture for
 * any content that is not exactly box-shaped.
 *
 * The raw fit ratio is deliberately NOT floored at {@link MIN_ZOOM}: showing
 * the whole of an oversized map is this function's entire job, and clamping
 * the zoom up would silently crop content the operator never asked to crop.
 * It IS capped at {@link MAX_ZOOM}, because magnifying a small or degenerate
 * piece of content past the ceiling this module already uses for
 * interactive zoom would show pixels with no content behind them, which is
 * no more useful during the initial fit than it is when reached by the
 * wheel — the box is simply left under-filled (letterboxed on both axes) in
 * that case, which is the correct outcome for a broken or placeholder input,
 * not a plausible-looking full-bleed picture.
 *
 * @param content The content's own size, in content pixels.
 * @param box The box to fit it into, in CSS pixels.
 * @returns The viewport that centres the fitted content in the box.
 * @throws Error When either size has a non-positive or non-finite dimension.
 */
export function fitToBox(content: Size, box: Size): MapViewport {
  assertPositiveSize(content, "content");
  assertPositiveSize(box, "box");
  const rawScale = Math.min(box.width / content.width, box.height / content.height);
  const zoom = Math.min(rawScale, MAX_ZOOM);
  return {
    zoom,
    panX: (box.width - content.width * zoom) / 2,
    panY: (box.height - content.height * zoom) / 2,
  };
}
