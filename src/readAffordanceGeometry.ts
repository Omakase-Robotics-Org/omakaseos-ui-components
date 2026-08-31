/**
 * @file Reading the drawn affordance geometry from the design system, for the
 *       one kind of consumer that cannot use CSS to draw a glyph.
 *
 * Every SVG affordance in this library gets its drawn size from the
 * `--ds-edit-*` tokens in `src/tokens.css`, applied through CSS geometry
 * properties. That is why no component can compute a size and therefore why no
 * interaction state can multiply one.
 *
 * A WebGL surface cannot do that. `robot-status-server-app`'s three.js map
 * viewer builds its own markers for the same vocabulary and needs the size as a
 * NUMBER. Before this module it took `HANDLE_RADIUS_PX` from the pointer-frame
 * constants, which is how the drawn size and the pick tolerance came to be one
 * number in the first place -- the confusion this release exists to undo.
 *
 * So the number is read back from the token, from the live cascade, rather than
 * restated in TypeScript. Restating it would recreate exactly the two sources of
 * truth that let a selected marker grow by 1.7x in one renderer while the SVG
 * renderer held still.
 *
 * It REFUSES rather than guesses. A token that is absent, empty, or not a
 * positive finite pixel length throws, naming the token: a WebGL layer drawing
 * markers at a silently-defaulted size is the failure this whole change is
 * about, and a fallback here would reintroduce it under a different name.
 */

/** The token that carries the edge length of a path anchor, in screen pixels. */
export const AFFORDANCE_ANCHOR_EDGE_TOKEN = "--ds-edit-anchor-edge";

/**
 * The drawn geometry of the affordance vocabulary, in screen pixels.
 *
 * `anchorEdge` is the base quantity every other drawn size in `tokens.css` is a
 * stated relation to; a renderer that needs one of those relations computes it
 * from this the same way the stylesheet does, so there is still one number.
 */
export type AffordanceGeometry = {
  /** Edge length of a path anchor's square, in screen pixels. */
  readonly anchorEdge: number;
  /**
   * Half the diagonal of that square: the radius of the disc that contains the
   * anchor at any rotation, which is what a round renderer needs to clear it.
   */
  readonly anchorClear: number;
};

/**
 * Read the drawn affordance geometry out of the cascade at `element`.
 *
 * @param element Any element inside the tree the library's tokens are applied
 *   to -- typically the renderer's own container, so a host that scopes the
 *   tokens per subtree reads the value that subtree actually draws under.
 * @returns The drawn geometry in screen pixels.
 * @throws If the token is missing or is not a positive finite pixel length.
 */
export function readAffordanceGeometry(element: Element): AffordanceGeometry {
  const raw = getComputedStyle(element).getPropertyValue(AFFORDANCE_ANCHOR_EDGE_TOKEN).trim();
  if (raw.length === 0) {
    throw new Error(
      `readAffordanceGeometry: ${AFFORDANCE_ANCHOR_EDGE_TOKEN} is not set on this element's cascade. ` +
        "The library's tokens stylesheet (@omakase-robotics/ui-components/tokens.css) has to be loaded " +
        "in the document that draws affordances; a marker sized by a guessed default is the defect this " +
        "release removes, so there is deliberately no fallback.",
    );
  }
  if (!raw.endsWith("px")) {
    throw new Error(
      `readAffordanceGeometry: ${AFFORDANCE_ANCHOR_EDGE_TOKEN} resolved to "${raw}", which is not a px length. ` +
        "The drawn affordance geometry is a screen-pixel quantity; a renderer cannot convert an em or a " +
        "percentage without knowing a context this function is not given.",
    );
  }
  const anchorEdge = Number.parseFloat(raw);
  if (!Number.isFinite(anchorEdge) || anchorEdge <= 0) {
    throw new Error(
      `readAffordanceGeometry: ${AFFORDANCE_ANCHOR_EDGE_TOKEN} resolved to "${raw}", which is not a positive length.`,
    );
  }
  return { anchorEdge, anchorClear: (anchorEdge * Math.SQRT2) / 2 };
}
