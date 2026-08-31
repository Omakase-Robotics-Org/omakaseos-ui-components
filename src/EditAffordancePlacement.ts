/**
 * @file The one placement rule every direct-manipulation glyph body is drawn
 * under.
 *
 * A glyph BODY (an anchor, a ghost, a knob, a badge, a snap mark) is drawn at
 * the ORIGIN, in screen pixels, sized entirely by the `--ds-edit-*` tokens in
 * `src/tokens.css` through CSS geometry properties. This function is what puts
 * it where it belongs: a translate to the position the host asked for, and a
 * uniform scale that turns those screen pixels into the host surface's own
 * user units.
 *
 * Why it matters beyond tidiness: because the body carries no size of its own,
 * NO component can compute a size, and therefore no interaction state can
 * multiply one. That is the mechanism -- not a convention -- behind "a selected
 * anchor is a filled anchor of the same size".
 *
 * The two glyphs that have no body (`EditMarquee`, `EditRubberBand`) never call
 * this: they span two host positions, so their geometry IS host coordinates and
 * their only drawn quantity is stroke weight, which they declare as a screen
 * quantity via `vector-effect: non-scaling-stroke`.
 */

/**
 * The identity counter-scale: the host surface's user units already ARE screen
 * pixels (a plain `viewBox="0 0 W H"` overlay at 1:1, which is what the demo
 * harness and the glyph stories use).
 *
 * This is a declared identity, not a fallback: a surface whose units are metres
 * or raster cells states its own value, and a broken one is refused below
 * rather than silently drawn at the wrong size.
 */
export const IDENTITY_UNITS_PER_PIXEL = 1;

/**
 * The transform that places one glyph body.
 *
 * @param x Position of the glyph in the host's own user units.
 * @param y Position of the glyph in the host's own user units.
 * @param unitsPerPixel The host's counter-scale: how many of its user units
 *   make one screen pixel (the map surface's `scale`).
 * @returns An SVG transform for the body group.
 */
export function affordancePlacement(x: number, y: number, unitsPerPixel: number): string {
  if (!Number.isFinite(unitsPerPixel) || unitsPerPixel <= 0) {
    throw new Error(
      `Edit affordance: unitsPerPixel must be a positive, finite number (got ${String(unitsPerPixel)}). ` +
        "It is the host surface's user units per screen pixel; pass 1 when the surface is already " +
        "in screen pixels. A wrong counter-scale draws every affordance at the wrong size at every " +
        "zoom, so it is refused rather than defaulted.",
    );
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(
      `Edit affordance: a glyph position must be finite (got ${String(x)}, ${String(y)}).`,
    );
  }
  return `translate(${String(x)} ${String(y)}) scale(${String(unitsPerPixel)})`;
}
