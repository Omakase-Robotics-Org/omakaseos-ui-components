/**
 * @file EditGhostHandle -- the marker for "an anchor will be inserted here".
 *
 * Direct-manipulation layer. It is drawn as the thing it would BECOME: the same
 * 7px square as `EditHandle`'s anchor, hollow and dashed. The dash is the whole
 * distinction -- prospective, not yet real -- and it is the same dash rhythm the
 * marquee and the pending leg use, because they mean the same thing.
 *
 * ## What it means, and when it appears
 *
 * With coarse input it is the persistent midpoint of every path segment: the
 * tap target that inserts, which is what makes touch editing work without
 * hover. With fine input it appears ONLY while the insertion is being asked
 * for (Alt held over an edge), pinned to the edge's nearest point rather than
 * following the pointer -- a marker that chases the cursor is the interference
 * this revision removes.
 *
 * Its size does not change between states, and does not change between fine and
 * coarse input either: a finger is accommodated by `GHOST_PICK_RADIUS_PX` and
 * `COARSE_PICK_SCALE` (`src/direct-manipulation/constants.ts`), not by drawing a
 * larger mark. Every drawn length comes from the `--ds-edit-*` tokens.
 *
 * Call-shape policy: one geometry-and-state call shape; no passthrough SVG
 * props are accepted.
 *
 * Cross-app constraint: the accent and soft fill are existing --ds-* tokens,
 * including the fully desaturated robot-inspection-web palette. No hue-only
 * state is introduced here.
 */
import {
  IDENTITY_UNITS_PER_PIXEL,
  affordancePlacement,
} from "./EditAffordancePlacement";
import styles from "./EditGhostHandle.module.css";

/**
 * `target` is the drop destination of a live insertion drag - the segment this
 * point is about to join - which is why it is emphasised while everything else
 * on the surface stays quiet.
 */
export type EditGhostHandleProps = {
  x: number;
  y: number;
  state: "idle" | "hover" | "target";
  /** The host's user units per screen pixel; 1 when the surface is in pixels. */
  unitsPerPixel?: number;
};

/** A hollow dashed square indicating where an anchor would be inserted. */
export function EditGhostHandle({
  x,
  y,
  state,
  unitsPerPixel = IDENTITY_UNITS_PER_PIXEL,
}: EditGhostHandleProps) {
  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.body} transform={affordancePlacement(x, y, unitsPerPixel)}>
        <rect className={styles.ghost} data-edit-glyph="ghost" />
      </g>
    </g>
  );
}
