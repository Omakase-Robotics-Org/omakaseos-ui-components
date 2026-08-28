/**
 * @file EditGhostHandle — the marker for "a vertex will be inserted here".
 *
 * Direct-manipulation layer. This SVG fragment is deliberately hollow and
 * quiet: its dashed ring and soft accent wash mean "a new point can be made
 * here" without being mistaken for an existing handle. The host owns hit
 * testing and dragging; this component only draws the vocabulary.
 *
 * ## What it means, and when it appears
 *
 * With coarse input it is the persistent midpoint of every path segment: the
 * tap target that inserts, which is what makes touch editing work without
 * hover. With fine input it appears ONLY while the insertion is being asked
 * for (Alt held over an edge), pinned to the edge's nearest point rather than
 * following the pointer — a marker that chases the cursor is the interference
 * this revision removes.
 *
 * Call-shape policy: one geometry-and-state call shape; no passthrough SVG
 * props are accepted.
 *
 * Cross-app constraint: the accent and soft fill are existing --ds-* tokens,
 * including the fully desaturated robot-inspection-web palette. No hue-only
 * state is introduced here.
 */
import { GHOST_RADIUS_PX } from "./direct-manipulation/constants";
import styles from "./EditGhostHandle.module.css";

/**
 * `target` is the drop destination of a live insertion drag - the segment this
 * point is about to join - which is why it is emphasised while everything else
 * on the surface stays quiet.
 */
export type EditGhostHandleProps = {
  x: number;
  y: number;
  radiusPx?: number;
  state: "idle" | "hover" | "target";
};

const GHOST_HOVER_SCALE = 1.15;
const GHOST_TARGET_SCALE = 1.35;

function scaleFor(state: EditGhostHandleProps["state"]): number {
  if (state === "hover") {
    return GHOST_HOVER_SCALE;
  }
  if (state === "target") {
    return GHOST_TARGET_SCALE;
  }
  return 1;
}

/** A hollow dashed ring indicating where a vertex would be inserted. */
export function EditGhostHandle({
  x,
  y,
  radiusPx = GHOST_RADIUS_PX,
  state,
}: EditGhostHandleProps) {
  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className={styles.ring}
        cx={x}
        cy={y}
        r={radiusPx * scaleFor(state)}
        strokeDasharray="4 3"
      />
    </g>
  );
}
