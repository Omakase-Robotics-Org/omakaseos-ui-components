/**
 * @file WORLD ↔ RASTER-PIXEL projection, in the ROS `map_server` convention.
 *
 * A map raster is an image the world was rendered into at a fixed metres-
 * per-pixel resolution, with the WORLD coordinate of the raster's own
 * bottom-left pixel recorded alongside it (`originX`/`originY`). Every host
 * that draws vertices, stations, or a robot's pose on top of such a raster
 * needs to go back and forth between "a point in the world" and "a pixel on
 * the image", and this module is that arithmetic, promoted from the DOM-free
 * twin already proven in rssa's `lib/map-editor/raster.ts` (`worldToPixel`).
 *
 * ## The coordinate convention, which is not the obvious one
 *
 * `resolution` is metres (or whatever world unit the host uses) per pixel.
 * `originX`/`originY` is the world coordinate of the BOTTOM-LEFT pixel, while
 * row 0 of the image is the TOP row — images are addressed from the top,
 * worlds are addressed with y increasing upward. The two disagree about
 * which way is "up", so converting between them means a vertical flip:
 *
 * ```
 * col = (x - originX) / resolution
 * row = pixelHeight - (y - originY) / resolution
 * ```
 *
 * Getting the flip backwards does not throw or look obviously wrong — it
 * places every point at its correct HEIGHT above the wrong edge, so a
 * vertex dragged near the top of the picture lands near the bottom of the
 * world and every edit looks plausible until it is compared against the
 * live map. This module is the one place that convention is written down;
 * {@link project} and {@link unproject} are exact inverses of one another,
 * asserted as a round trip in this module's spec.
 *
 * Pure functions only: no React, no DOM, no wire, no clock.
 *
 * ## Where validation lives
 *
 * Both {@link project} and {@link unproject} cross a real boundary — they
 * take a raw `RasterFrame` (which may describe a map that failed to parse,
 * a placeholder before metadata has loaded, or a frame stitched together by
 * a caller) and a raw point. Per the workspace's fail-first rule, a
 * degenerate frame (zero or negative resolution, a non-positive pixel size,
 * a non-finite origin) or a non-finite point is refused outright rather than
 * projected to a plausible-looking but meaningless pixel or world position.
 */

/** One raster's placement in the world, in the ROS `map_server` convention. */
export type RasterFrame = {
  /** The raster's width in pixels. */
  readonly pixelWidth: number;
  /** The raster's height in pixels. */
  readonly pixelHeight: number;
  /** World units per pixel (metres per pixel for a SLAM/nav map). */
  readonly resolution: number;
  /** The world X of the raster's BOTTOM-LEFT pixel. */
  readonly originX: number;
  /** The world Y of the raster's BOTTOM-LEFT pixel. */
  readonly originY: number;
};

/** A position in the world frame, in the raster's own world units. */
export type WorldPoint = {
  readonly x: number;
  readonly y: number;
};

/** A position in the raster's own pixel space, row 0 at the TOP. */
export type RasterPoint = {
  readonly col: number;
  readonly row: number;
};

/**
 * Assert a frame describes real, usable raster geometry.
 *
 * @param frame The frame to check.
 * @param fn The calling function's name, for the error message.
 * @throws Error When any dimension is non-positive/non-finite, or an origin
 *   is non-finite.
 */
function assertValidFrame(frame: RasterFrame, fn: string): void {
  if (!Number.isFinite(frame.resolution) || frame.resolution <= 0) {
    throw new Error(`${fn}: frame.resolution must be a positive finite number, got ${String(frame.resolution)}`);
  }
  if (!Number.isFinite(frame.pixelWidth) || frame.pixelWidth <= 0) {
    throw new Error(`${fn}: frame.pixelWidth must be a positive finite number, got ${String(frame.pixelWidth)}`);
  }
  if (!Number.isFinite(frame.pixelHeight) || frame.pixelHeight <= 0) {
    throw new Error(`${fn}: frame.pixelHeight must be a positive finite number, got ${String(frame.pixelHeight)}`);
  }
  if (!Number.isFinite(frame.originX) || !Number.isFinite(frame.originY)) {
    throw new Error(
      `${fn}: frame.originX/originY must be finite, got (${String(frame.originX)}, ${String(frame.originY)})`,
    );
  }
}

/**
 * The raster pixel a world position falls on.
 *
 * @param frame The raster geometry.
 * @param worldPoint The world position.
 * @returns The raster pixel (fractional — floor it to address a discrete
 *   pixel; this module does not decide that rounding for its caller).
 * @throws Error When `frame` is not usable geometry, or `worldPoint` has a
 *   non-finite coordinate.
 */
export function project(frame: RasterFrame, worldPoint: WorldPoint): RasterPoint {
  assertValidFrame(frame, "project");
  if (!Number.isFinite(worldPoint.x) || !Number.isFinite(worldPoint.y)) {
    throw new Error(
      `project: worldPoint must have finite x/y, got (${String(worldPoint.x)}, ${String(worldPoint.y)})`,
    );
  }
  return {
    col: (worldPoint.x - frame.originX) / frame.resolution,
    row: frame.pixelHeight - (worldPoint.y - frame.originY) / frame.resolution,
  };
}

/**
 * The exact inverse of {@link project}.
 *
 * @param frame The raster geometry.
 * @param rasterPoint The raster pixel.
 * @returns The world position.
 * @throws Error When `frame` is not usable geometry, or `rasterPoint` has a
 *   non-finite coordinate.
 */
export function unproject(frame: RasterFrame, rasterPoint: RasterPoint): WorldPoint {
  assertValidFrame(frame, "unproject");
  if (!Number.isFinite(rasterPoint.col) || !Number.isFinite(rasterPoint.row)) {
    throw new Error(
      `unproject: rasterPoint must have finite col/row, got (${String(rasterPoint.col)}, ${String(rasterPoint.row)})`,
    );
  }
  return {
    x: frame.originX + rasterPoint.col * frame.resolution,
    y: frame.originY + (frame.pixelHeight - rasterPoint.row) * frame.resolution,
  };
}
