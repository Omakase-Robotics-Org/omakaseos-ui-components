/**
 * @file The OCCUPANCY GRID as an editable document: the three-valued
 * vocabulary a pixel byte carries, and the pure brush kernel that paints it.
 *
 * A map raster is an 8-bit greyscale image in the ROS `map_server`
 * convention (see `./projection.ts`'s header for the world/pixel geometry
 * that convention also implies): 255 is free floor, 0 is an obstacle, and
 * the middle of the range is ground nothing has ever swept — UNKNOWN. This
 * module is the "editing the picture itself" half of that convention: an
 * {@link OccupancyDocument} (dimensions plus a pixel buffer), the value
 * vocabulary the buffer's bytes are read through ({@link classifyPixel} /
 * {@link pixelFor}), the brush operations that change it
 * ({@link paintDab}, {@link paintStroke}), and PGM (`P5`) encoding of the
 * result ({@link encodeOccupancyPgm}).
 *
 * ## Where the thresholds come from
 *
 * The three-way split and its exact boundaries are not invented here: they
 * are the same numbers `robot-status-server-app`'s scene lint already polices
 * pixel-under-a-vertex checks against (`lib/map-editor/lint.ts`,
 * `POINT_MIN_PIXEL = 200`, `EDGE_MIN_PIXEL = 130`). A pixel this module
 * classifies as "free" or "occupied" is therefore a pixel the lint would
 * agree is free or occupied — the two never disagree about where the line
 * is, because there is exactly one line, named once
 * ({@link FREE_THRESHOLD}, {@link OCCUPIED_THRESHOLD}) and read everywhere
 * a byte needs a meaning.
 *
 * ## Why painting returns a NEW document rather than mutating one
 *
 * {@link OccupancyDocument} is shaped to be the `D` in
 * `../direct-manipulation/session.ts`'s `EditSession<D>`: `beginSession`
 * snapshots whatever is handed to it, and `commitEdit` pushes the CURRENT
 * value onto `past` before replacing it. Both only work if a document, once
 * committed, never changes under the session's feet — so every brush
 * operation here clones the pixel buffer into a fresh document rather than
 * writing through the one it was given. A host wires a stroke's finished
 * result into `commitEdit(session, next)` and gets undo/redo for free; nothing
 * in this module knows a session exists.
 *
 * ## The dotted-line problem, and how the stroke helper avoids it
 *
 * A pointer's `pointermove` stream is a sequence of discrete samples, and a
 * fast drag can arrive with tens of raster cells between two consecutive
 * samples — call {@link paintDab} once per sample and the result is a row of
 * separate dots with gaps between them, not a line. {@link paintStroke}
 * instead treats the two endpoints as one gesture: it walks from `from` to
 * `to` in steps no larger than half the brush radius (so consecutive stamps
 * always overlap by at least half a radius) and unions every stamp's pixels
 * before writing the buffer once. See {@link strokeSamples} for the exact
 * spacing rule.
 *
 * Pure functions only: no React, no DOM, no wire, no clock.
 */

/**
 * The three-valued vocabulary a map pixel's byte is read through.
 *
 * "occupied" is an obstacle a chassis must not cross, "free" is floor it may
 * drive on, and "unknown" is ground nothing has ever mapped (drawn as the
 * mid-grey band between the two). These three names are the only spellings
 * this module uses for what a byte means; call sites should never compare a
 * pixel to a raw threshold number themselves.
 */
export type OccupancyValue = "occupied" | "free" | "unknown";

/**
 * The byte {@link paintDab}/{@link paintStroke} write for each vocabulary
 * value, and the canonical greyscale a fresh/blank document is filled with.
 *
 * These are the RASTER'S OWN ENCODING, which is the ROS `map_server` /
 * Cartographer convention: 0 occupied, 128 unmapped, 255 free. Measured on
 * the real robot export `cuc_1_north-0826-01`, whose 1,164,312 cells are
 * dominated by exactly these three bytes — 691,020 at 128 (the unmapped
 * surround), 317,099 at 255 (free floor), 34,566 at 0 (walls) — so a cell
 * this module paints is byte-identical to a cell the robot's own SLAM wrote.
 *
 * A tempting mistake, made and reverted here, is to paint unknown as the
 * midpoint of the vendor lint's unknown BAND (130..199) so that
 * {@link classifyPixel} returns "unknown" for it. That inverts the
 * reasoning. The lint's bands and the raster's encoding are two different
 * vocabularies answering two different questions:
 *
 *   - the ENCODING says what a cell IS, and unmapped ground is 128;
 *   - the lint's bands say whether a waypoint may be PLACED there, and the
 *     vendor's answer for unmapped ground is no (128 falls below
 *     {@link OCCUPIED_THRESHOLD}).
 *
 * Painting a byte inside the lint's unknown band would make cells this
 * editor paints behave DIFFERENTLY from the identically-grey cells the SLAM
 * left unmapped, which is the actual defect. So {@link classifyPixel} of
 * {@link UNKNOWN_PIXEL} is deliberately NOT "unknown" — see the spec, which
 * pins that non-identity on purpose rather than hiding it.
 */
export const OCCUPIED_PIXEL = 0;
export const FREE_PIXEL = 255;
export const UNKNOWN_PIXEL = 128;

/**
 * The free/unknown boundary: a byte at or above this is FREE.
 *
 * Matches `robot-status-server-app`'s `lib/map-editor/lint.ts`
 * `POINT_MIN_PIXEL` exactly — see the file header for why that identity
 * matters.
 */
export const FREE_THRESHOLD = 200;

/**
 * The unknown/occupied boundary: a byte below this is OCCUPIED, and a byte
 * at or above it (but below {@link FREE_THRESHOLD}) is UNKNOWN.
 *
 * Matches `robot-status-server-app`'s `lib/map-editor/lint.ts`
 * `EDGE_MIN_PIXEL` exactly — see the file header for why that identity
 * matters.
 */
export const OCCUPIED_THRESHOLD = 130;

/**
 * Read a raw greyscale byte as the vocabulary value it represents.
 *
 * @param byte A pixel's 0..255 value. Values outside that range are read as
 *   whichever end they clamp toward (a value above 255 cannot occur in a
 *   `Uint8Array`, so this is only reachable from a caller that widened the
 *   type — it is still classified rather than thrown, because classifying is
 *   a read and reads do not corrupt a document the way a silent write would).
 * @returns The value.
 */
export function classifyPixel(byte: number): OccupancyValue {
  if (byte >= FREE_THRESHOLD) {
    return "free";
  }
  if (byte < OCCUPIED_THRESHOLD) {
    return "occupied";
  }
  return "unknown";
}

/**
 * The canonical byte a vocabulary value is painted as.
 *
 * @param value The value.
 * @returns The byte.
 */
export function pixelFor(value: OccupancyValue): number {
  if (value === "free") {
    return FREE_PIXEL;
  }
  if (value === "occupied") {
    return OCCUPIED_PIXEL;
  }
  return UNKNOWN_PIXEL;
}

/** An occupancy-grid document: dimensions plus a pixel buffer. */
export type OccupancyDocument = {
  /** The raster's width in pixels. */
  readonly width: number;
  /** The raster's height in pixels. */
  readonly height: number;
  /** Exactly `width * height` bytes, row-major, starting at the TOP row. */
  readonly pixels: Uint8Array;
};

/** A brush stamp's shape. */
export type BrushShape = "disc" | "square";

/** A position in the document's own pixel space — same convention as `RasterPoint` (row 0 at the TOP), fractional. */
export type CellPoint = {
  readonly col: number;
  readonly row: number;
};

/**
 * Refuse a document whose shape cannot be painted safely.
 *
 * Per the workspace's fail-first rule: a non-positive/non-integer dimension
 * or a buffer whose length disagrees with `width * height` is refused
 * outright rather than painted into (which would either throw deep inside a
 * loop with a confusing index, or — worse — silently write into the wrong
 * row).
 *
 * @param document The document to check.
 * @param fn The calling function's name, for the error message.
 * @throws Error When the document is not paintable.
 */
function assertValidDocument(document: OccupancyDocument, fn: string): void {
  if (!Number.isInteger(document.width) || document.width <= 0) {
    throw new Error(`${fn}: document.width must be a positive integer, got ${String(document.width)}`);
  }
  if (!Number.isInteger(document.height) || document.height <= 0) {
    throw new Error(`${fn}: document.height must be a positive integer, got ${String(document.height)}`);
  }
  const expected = document.width * document.height;
  if (document.pixels.length !== expected) {
    throw new Error(
      `${fn}: document is ${String(document.width)}x${String(document.height)} = ${String(expected)} pixels but ` +
        `carries ${String(document.pixels.length)} bytes`,
    );
  }
}

/**
 * Refuse a cell whose coordinate is not a real position.
 *
 * @param cell The cell to check.
 * @param fn The calling function's name, for the error message.
 * @param label Which parameter this is (`"at"`, `"from"`, `"to"`), so a
 *   caller passing two cells (a stroke's endpoints) can tell which one was
 *   bad from the message alone.
 * @throws Error When either coordinate is non-finite.
 */
function assertFiniteCell(cell: CellPoint, fn: string, label: string): void {
  if (!Number.isFinite(cell.col) || !Number.isFinite(cell.row)) {
    throw new Error(`${fn}: ${label} must have finite col/row, got (${String(cell.col)}, ${String(cell.row)})`);
  }
}

/**
 * Refuse a brush radius that could not paint anything, or that would answer
 * with a plausible-looking but meaningless stamp.
 *
 * @param radiusCells The radius to check, in document cells.
 * @param fn The calling function's name, for the error message.
 * @throws Error When the radius is non-finite, zero, or negative.
 */
function assertPositiveRadius(radiusCells: number, fn: string): void {
  if (!Number.isFinite(radiusCells) || radiusCells <= 0) {
    throw new Error(`${fn}: radiusCells must be a positive finite number, got ${String(radiusCells)}`);
  }
}

/**
 * Create a fresh, independent document from raw pixel bytes.
 *
 * The bytes are COPIED rather than adopted: a caller that later mutates the
 * `Uint8Array` it handed over (a decoded image buffer it keeps reusing, say)
 * must not be able to reach back through a document that has already been
 * committed into an `EditSession` and change what "undo" returns to.
 *
 * @param width The raster's width in pixels.
 * @param height The raster's height in pixels.
 * @param pixels Exactly `width * height` bytes, row-major from the TOP row.
 * @returns The document.
 * @throws Error When the dimensions are not positive integers, or `pixels`'
 *   length disagrees with `width * height`.
 */
export function createOccupancyDocument(width: number, height: number, pixels: Uint8Array): OccupancyDocument {
  const document: OccupancyDocument = { width, height, pixels: Uint8Array.from(pixels) };
  assertValidDocument(document, "createOccupancyDocument");
  return document;
}

/**
 * A fresh document of the given size, filled with one value throughout.
 *
 * @param width The raster's width in pixels.
 * @param height The raster's height in pixels.
 * @param fill The value every cell starts as. Defaults to "unknown", the
 *   convention's own reading of ground nothing has mapped yet.
 * @returns The document.
 * @throws Error When the dimensions are not positive integers.
 */
export function blankOccupancyDocument(
  width: number,
  height: number,
  fill: OccupancyValue = "unknown",
): OccupancyDocument {
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`blankOccupancyDocument: width must be a positive integer, got ${String(width)}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`blankOccupancyDocument: height must be a positive integer, got ${String(height)}`);
  }
  const pixels = new Uint8Array(width * height);
  pixels.fill(pixelFor(fill));
  return { width, height, pixels };
}

/**
 * Every pixel INDEX (`row * width + col`) a stamp centred at `at` covers,
 * clipped to the document's bounds.
 *
 * The centre and radius are both in fractional CELLS — the same units
 * {@link CellPoint} and `RasterPoint` already use — so a stamp addresses a
 * pixel by comparing that pixel's own integer address to `at`, exactly the
 * way `map-canvas/projection.ts` addresses a pixel from a fractional
 * projection (floor to land on one). There is no half-pixel "sample at the
 * centre" offset here, because there is nowhere else in this codebase's
 * raster convention that uses one either.
 *
 * @param document The document being painted (for its bounds only).
 * @param at The stamp's centre.
 * @param radiusCells The stamp's radius, in cells.
 * @param shape "disc" (Euclidean) or "square" (Chebyshev).
 * @returns The covered pixel indices, each index appearing once.
 */
function stampIndices(
  document: OccupancyDocument,
  at: CellPoint,
  radiusCells: number,
  shape: BrushShape,
): readonly number[] {
  const { width, height } = document;
  const minCol = Math.max(0, Math.floor(at.col - radiusCells));
  const maxCol = Math.min(width - 1, Math.ceil(at.col + radiusCells));
  const minRow = Math.max(0, Math.floor(at.row - radiusCells));
  const maxRow = Math.min(height - 1, Math.ceil(at.row + radiusCells));
  const radiusSquared = radiusCells * radiusCells;
  const indices: number[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    const dy = row - at.row;
    for (let col = minCol; col <= maxCol; col += 1) {
      const dx = col - at.col;
      const inside = shape === "disc" ? dx * dx + dy * dy <= radiusSquared : Math.abs(dx) <= radiusCells && Math.abs(dy) <= radiusCells;
      if (inside) {
        indices.push(row * width + col);
      }
    }
  }
  return indices;
}

/**
 * Write one vocabulary value into a set of pixel indices, cloning the buffer
 * exactly once.
 *
 * @param document The document to paint.
 * @param indices The pixel indices to write. May repeat; repeats are only
 *   written once each, harmlessly.
 * @param value The value to paint.
 * @returns A new document, or the SAME document instance when nothing was
 *   actually painted a different colour (an idle hover, or a stamp entirely
 *   over cells already at this value) — so a host that only commits an edit
 *   when the reference changes does not grow its undo history for a no-op.
 */
function applyPaint(document: OccupancyDocument, indices: Iterable<number>, value: OccupancyValue): OccupancyDocument {
  const byte = pixelFor(value);
  let pixels: Uint8Array | null = null;
  for (const index of indices) {
    if (document.pixels[index] === byte) {
      continue;
    }
    if (pixels === null) {
      pixels = Uint8Array.from(document.pixels);
    }
    pixels[index] = byte;
  }
  if (pixels === null) {
    return document;
  }
  return { width: document.width, height: document.height, pixels };
}

/**
 * Paint one brush stamp — a disc or a square of `radiusCells` — centred at
 * `at`.
 *
 * @param document The document to paint.
 * @param at The stamp's centre, in document cells.
 * @param radiusCells The stamp's radius, in cells.
 * @param value The vocabulary value to paint.
 * @param shape The stamp's shape. Defaults to "disc".
 * @returns A new document with the stamp applied (or the same instance —
 *   see {@link applyPaint} — when the stamp changed nothing, e.g. it landed
 *   entirely off the raster).
 * @throws Error When `document` is not paintable, `at` is not finite, or
 *   `radiusCells` is not a positive finite number.
 */
export function paintDab(
  document: OccupancyDocument,
  at: CellPoint,
  radiusCells: number,
  value: OccupancyValue,
  shape: BrushShape = "disc",
): OccupancyDocument {
  assertValidDocument(document, "paintDab");
  assertFiniteCell(at, "paintDab", "at");
  assertPositiveRadius(radiusCells, "paintDab");
  return applyPaint(document, stampIndices(document, at, radiusCells, shape), value);
}

/**
 * How much of the brush's radius separates two consecutive stamps along a
 * stroke.
 *
 * At 1.0 two adjacent stamps' centres are exactly `radiusCells` apart —
 * their discs still touch, but only just, and float rounding can leave a
 * one-pixel gap at the seam. Halving it means consecutive stamps overlap by
 * at least half a radius, which absorbs that rounding with room to spare —
 * the constant is deliberately smaller than the "just touching" number, not
 * tuned down from testing a gap after the fact.
 */
const STROKE_STEP_FRACTION = 0.5;

/**
 * The sampled points a stroke's endpoints expand into.
 *
 * A `pointermove` stream can arrive with tens of cells between two
 * consecutive events on a fast drag; stamping only at the reported points
 * leaves a dotted line. This walks the straight segment from `from` to `to`
 * in steps of at most `radiusCells * STROKE_STEP_FRACTION`, so that
 * consecutive stamps always overlap and the union of all of them is a solid
 * band the width of the brush.
 *
 * @param from The stroke's start, in document cells.
 * @param to The stroke's end, in document cells.
 * @param radiusCells The brush radius the step size is derived from.
 * @returns The sampled points, including both endpoints. At least one point.
 */
function strokeSamples(from: CellPoint, to: CellPoint, radiusCells: number): readonly CellPoint[] {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return [from];
  }
  const step = radiusCells * STROKE_STEP_FRACTION;
  const steps = Math.max(1, Math.ceil(distance / step));
  const points: CellPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ col: from.col + dx * t, row: from.row + dy * t });
  }
  return points;
}

/**
 * Paint a continuous band between two cell coordinates — a drag's last
 * reported point and its new one — with no gaps, however far apart the two
 * points are.
 *
 * @param document The document to paint.
 * @param from The stroke segment's start, in document cells.
 * @param to The stroke segment's end, in document cells.
 * @param radiusCells The brush radius, in cells.
 * @param value The vocabulary value to paint.
 * @param shape The stamp's shape. Defaults to "disc".
 * @returns A new document with the whole segment painted (or the same
 *   instance — see {@link applyPaint} — when it changed nothing).
 * @throws Error When `document` is not paintable, `from`/`to` is not finite,
 *   or `radiusCells` is not a positive finite number.
 */
export function paintStroke(
  document: OccupancyDocument,
  from: CellPoint,
  to: CellPoint,
  radiusCells: number,
  value: OccupancyValue,
  shape: BrushShape = "disc",
): OccupancyDocument {
  assertValidDocument(document, "paintStroke");
  assertFiniteCell(from, "paintStroke", "from");
  assertFiniteCell(to, "paintStroke", "to");
  assertPositiveRadius(radiusCells, "paintStroke");
  const touched = new Set<number>();
  for (const sample of strokeSamples(from, to, radiusCells)) {
    for (const index of stampIndices(document, sample, radiusCells, shape)) {
      touched.add(index);
    }
  }
  return applyPaint(document, touched, value);
}

/** The two bytes every binary PGM begins with. */
const PGM_MAGIC = "P5";

/** The maximum value this module writes: an 8-bit occupancy grid, one byte per pixel. */
const PGM_MAXVAL = 255;

/**
 * Encode a document as a binary PGM (`P5`).
 *
 * The header is written in the same minimal spelling
 * `robot-status-server-app`'s `lib/scene-bundle/pgm.ts` `encodePgm` uses —
 * `P5\n<width> <height>\n255\n`, no comment line — so a raster saved from
 * here is byte-for-byte the same shape as one the chassis firmware itself
 * would write for the same pixels. That reference module also decodes this
 * exact grammar; this one only writes it, since nothing in this repository
 * reads a PGM back in.
 *
 * @param document The document to encode.
 * @returns The whole file: header followed by the raw pixel bytes.
 * @throws Error When `document` is not paintable (see
 *   {@link assertValidDocument}) — the same refusal `encodePgm` makes for a
 *   pixel count that disagrees with its stated size.
 */
export function encodeOccupancyPgm(document: OccupancyDocument): Uint8Array {
  assertValidDocument(document, "encodeOccupancyPgm");
  const header = new TextEncoder().encode(
    `${PGM_MAGIC}\n${String(document.width)} ${String(document.height)}\n${String(PGM_MAXVAL)}\n`,
  );
  const out = new Uint8Array(header.length + document.pixels.length);
  out.set(header, 0);
  out.set(document.pixels, header.length);
  return out;
}
