/**
 * @file EditGhostHandle — a dashed midpoint affordance for direct insertion.
 *
 * Direct-manipulation layer. This SVG fragment is deliberately hollow and
 * quiet: its dashed ring and soft accent wash mean "a new point can be made
 * here" without being mistaken for an existing handle. The host owns hit
 * testing and dragging; this component only draws the vocabulary.
 *
 * Call-shape policy: one geometry-only call shape (`x`, `y`, and optional
 * radius); no passthrough SVG props are accepted.
 *
 * Cross-app constraint: the accent and soft fill are existing --ds-* tokens,
 * including the fully desaturated robot-inspection-web palette. No hue-only
 * state is introduced here.
 */
import { GHOST_RADIUS_PX } from "./direct-manipulation/constants";
import styles from "./EditGhostHandle.module.css";

export type EditGhostHandleProps = {
  x: number;
  y: number;
  radiusPx?: number;
};

/** A hollow dashed ring indicating a draggable insertion point. */
export function EditGhostHandle({
  x,
  y,
  radiusPx = GHOST_RADIUS_PX,
}: EditGhostHandleProps) {
  return (
    <g className={styles.group} aria-hidden="true" focusable="false">
      <circle
        className={styles.ring}
        cx={x}
        cy={y}
        r={radiusPx}
        strokeDasharray="4 3"
      />
    </g>
  );
}
