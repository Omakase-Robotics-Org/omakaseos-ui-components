/**
 * @file EditHandle -- the anchor glyph of the direct-manipulation vocabulary.
 *
 * Direct-manipulation layer. This is an SVG fragment, not a standalone SVG or
 * an interactive widget: the host places it inside its editing surface and owns
 * all pointer handling.
 *
 * ## What it looks like, and why
 *
 * The SHAPE says what the position is; the FILL says what is happening to it.
 * That split is the whole design:
 *
 *  - `anchor` -- a square. A coordinate on a path: something the robot drives
 *    THROUGH. This is Illustrator's path anchor, and it is the same 7px.
 *  - `place` -- the same square, rotated 45 degrees into a diamond. A named
 *    location that carries a facing: something the robot drives TO. It is the
 *    identical rect element under the identical CSS, so a place can never be
 *    "a bigger anchor" -- the two differ by rotation alone.
 *
 * A hovered, selected, primary or dragged anchor is the SAME SIZE. Selection is
 * a filled anchor, exactly as in Illustrator; before v0.20 it was a 1.7x disc
 * (38px across, ringed to 48px) and read as a swelling blob. The size cannot
 * come back: this component computes no size at all. Every drawn quantity comes
 * from the `--ds-edit-*` tokens (`src/tokens.css`) through
 * `EditHandle.module.css`, and the body is drawn at the origin of the placement
 * group (`src/EditAffordancePlacement.ts`).
 *
 * Drawn size is NOT pick tolerance. This 7px mark is caught by
 * `HANDLE_PICK_RADIUS_PX` (9px, and 1.6x that for a finger) -- see
 * `src/direct-manipulation/constants.ts`. Nothing here shrinks a hit area.
 *
 * Call-shape policy: there is one call shape, the geometry and state props
 * below. There are no passthrough SVG props because the fragment's hidden,
 * non-focusable boundary is part of the contract.
 *
 * Cross-app constraint: every color and transition comes from --ds-* tokens so
 * the same affordance remains legible on all three host palettes, including the
 * fully desaturated robot-inspection-web host.
 */
import {
  IDENTITY_UNITS_PER_PIXEL,
  affordancePlacement,
} from "./EditAffordancePlacement";
import styles from "./EditHandle.module.css";

/**
 * `primary` is a selected handle that is also the selection's PRIMARY: the one
 * whose heading knob is shown, and the one a single-target command acts on. It
 * is annotated with a thin outer RING at a fixed radius -- an annotation of the
 * anchor, never an enlargement of it.
 */
export type EditHandleProps = {
  x: number;
  y: number;
  /** What this drawn position is: a coordinate on a path, or a named place. */
  kind: "anchor" | "place";
  state: "idle" | "hover" | "selected" | "primary" | "dragging";
  /** Optional decorative direction tick, in radians. Only a place has a facing. */
  heading?: number;
  /** The host's user units per screen pixel; 1 when the surface is in pixels. */
  unitsPerPixel?: number;
};

const DEGREES_PER_RADIAN = 180 / Math.PI;

/** The map editor's draggable point affordance: a square, or a place's diamond. */
export function EditHandle({
  x,
  y,
  kind,
  state,
  heading,
  unitsPerPixel = IDENTITY_UNITS_PER_PIXEL,
}: EditHandleProps) {
  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.body} transform={affordancePlacement(x, y, unitsPerPixel)}>
        {state === "primary" ? (
          <circle className={styles.primaryRing} data-edit-annotation="primary" />
        ) : null}
        <rect
          className={styles.anchor}
          data-edit-glyph={kind}
          {...(kind === "place" ? { transform: "rotate(45)" } : {})}
        />
        {heading === undefined ? null : (
          <g transform={`rotate(${String(heading * DEGREES_PER_RADIAN)})`}>
            <rect className={styles.tick} data-edit-annotation="heading" />
          </g>
        )}
      </g>
    </g>
  );
}
