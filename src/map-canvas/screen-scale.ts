/**
 * @file The COUNTER-SCALE that keeps a screen-constant affordance
 * screen-constant under zoom, generalised from rssa's `viewBoxScale`.
 *
 * A handle drawn 9 CSS pixels wide should stay 9 CSS pixels wide at every
 * zoom level, not 9 RASTER pixels wide (which would make it vanish at low
 * zoom and swallow the map at high zoom). Doing that means knowing how many
 * raster pixels currently correspond to one CSS pixel, so a renderer can
 * divide its pixel-space handle size by that factor before drawing, and so
 * `direct-manipulation`'s `toleranceMetres(metresPerPixel, radiusPx,
 * fallbackM)` has the `metresPerPixel` it asks for.
 *
 * ## Why this returns `null` instead of rssa's `1`
 *
 * rssa's `viewBoxScale` returns the magic number `1` when the raster has not
 * been laid out yet (`drawn <= 0`) — a plausible-looking identity scale that
 * hides the fact that no real scale is known yet. This module holds the
 * workspace's fail-first line instead: an UNMEASURED layout (a CSS width of
 * exactly `0`, which is the ordinary transient state before a browser has
 * laid an element out, or before a host has attached a ref) is reported as
 * `null`, matching the convention this same package's `hit-test.ts`
 * (`toleranceMetres`) already uses for "the scale is unknown" — the CALLER
 * decides the fallback (rssa's own `FALLBACK_TOLERANCE_M`, or a host's
 * equivalent), rather than this module inventing one.
 *
 * A width that is present but NEGATIVE or non-finite is a different thing —
 * not a layout that has not happened yet, but a caller passing a number that
 * cannot describe a CSS box at all — and is refused with a thrown error, not
 * folded into the same `null` result.
 *
 * Pure functions only: no React, no DOM, no clock.
 */

import type { RasterFrame } from "./projection";

/**
 * Assert the frame and zoom are usable, and the layout width is a value that
 * could describe a real CSS box (zero — "not yet measured" — included).
 *
 * @param frame The raster geometry.
 * @param layoutWidthPx The raster's own layout width, in CSS pixels, before
 *   the viewport's zoom transform is applied.
 * @param zoom The viewport's current zoom.
 * @param fn The calling function's name, for the error message.
 * @throws Error When `frame.resolution`/`frame.pixelWidth` is not a positive
 *   finite number, `zoom` is not a positive finite number, or
 *   `layoutWidthPx` is negative or non-finite.
 */
function assertUsableInputs(frame: RasterFrame, layoutWidthPx: number, zoom: number, fn: string): void {
  if (!Number.isFinite(frame.resolution) || frame.resolution <= 0) {
    throw new Error(`${fn}: frame.resolution must be a positive finite number, got ${String(frame.resolution)}`);
  }
  if (!Number.isFinite(frame.pixelWidth) || frame.pixelWidth <= 0) {
    throw new Error(`${fn}: frame.pixelWidth must be a positive finite number, got ${String(frame.pixelWidth)}`);
  }
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`${fn}: zoom must be a positive finite number, got ${String(zoom)}`);
  }
  if (!Number.isFinite(layoutWidthPx) || layoutWidthPx < 0) {
    throw new Error(`${fn}: layoutWidthPx must be a non-negative finite number, got ${String(layoutWidthPx)}`);
  }
}

/**
 * How many raster pixels correspond to one screen (CSS) pixel, as the raster
 * is currently drawn.
 *
 * A host multiplies every handle radius or pick tolerance that is stated in
 * raster pixels by this value to keep it a constant SCREEN size under zoom.
 * `layoutWidthPx` is the raster's own layout width — its size before the
 * viewport's `scale(zoom)` transform is applied (rssa's `layoutWidthOf`) —
 * because a CSS-transform-scaled element's bounding rectangle already
 * carries the zoom once, and multiplying a rectangle that has been scaled
 * once by the scale again would square it (the bug rssa's own doc for
 * `layoutWidthOf` calls out). This function is what applies the zoom, once.
 *
 * @param frame The raster geometry.
 * @param layoutWidthPx The raster's layout width in CSS pixels.
 * @param zoom The viewport's current zoom.
 * @returns Raster units per screen pixel, or `null` when `layoutWidthPx` is
 *   `0` (the raster has not been laid out yet).
 * @throws Error When `frame` is not usable geometry, `zoom` is not a
 *   positive finite number, or `layoutWidthPx` is negative or non-finite.
 */
export function rasterUnitsPerScreenPixel(frame: RasterFrame, layoutWidthPx: number, zoom: number): number | null {
  assertUsableInputs(frame, layoutWidthPx, zoom, "rasterUnitsPerScreenPixel");
  if (layoutWidthPx === 0) {
    return null;
  }
  const drawnWidthPx = layoutWidthPx * zoom;
  return frame.pixelWidth / drawnWidthPx;
}

/**
 * World units (metres, for a SLAM/nav map) per screen pixel, as the raster
 * is currently drawn.
 *
 * This is {@link rasterUnitsPerScreenPixel} scaled by the frame's own
 * `resolution` (world units per raster pixel), which is the form
 * `direct-manipulation`'s `toleranceMetres(metresPerPixel, radiusPx,
 * fallbackM)` consumes directly.
 *
 * @param frame The raster geometry.
 * @param layoutWidthPx The raster's layout width in CSS pixels.
 * @param zoom The viewport's current zoom.
 * @returns World units per screen pixel, or `null` when `layoutWidthPx` is
 *   `0` (the raster has not been laid out yet).
 * @throws Error When `frame` is not usable geometry, `zoom` is not a
 *   positive finite number, or `layoutWidthPx` is negative or non-finite.
 */
export function metresPerScreenPixel(frame: RasterFrame, layoutWidthPx: number, zoom: number): number | null {
  const rasterUnits = rasterUnitsPerScreenPixel(frame, layoutWidthPx, zoom);
  if (rasterUnits === null) {
    return null;
  }
  return rasterUnits * frame.resolution;
}
