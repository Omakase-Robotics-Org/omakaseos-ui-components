/**
 * @file EditHandle — a compact, shape-carried grip for direct manipulation.
 *
 * Direct-manipulation layer. This is an SVG fragment, not a standalone SVG or
 * an interactive widget: the host places it inside its editing surface and
 * owns all pointer handling. The ring is the meaning — a solid outlined ring
 * says "this can be grabbed", a selected/dragging fill says "this is held".
 *
 * Call-shape policy: there is one call shape, the geometry and state props
 * below. There are no passthrough SVG props because the fragment's hidden,
 * non-focusable boundary is part of the contract.
 *
 * Cross-app constraint: every color and transition comes from --ds-* tokens
 * so the same affordance remains legible on all three host palettes,
 * including the fully desaturated robot-inspection-web host.
 */
import {
  HANDLE_RADIUS_PX,
  HANDLE_SELECTED_SCALE,
} from "./direct-manipulation/constants";
import styles from "./EditHandle.module.css";

/** A handle's visual interaction state. */
export type EditHandleProps = {
  x: number;
  y: number;
  radiusPx?: number;
  state: "idle" | "hover" | "selected" | "dragging";
  /** Optional decorative direction tick, in radians. */
  heading?: number;
};

/* Hover is deliberately a small step; selected/dragging use the grammar's
 * shared scale so the drawn and picked vocabularies agree. */
const HANDLE_HOVER_SCALE = 1.15;
const HANDLE_TICK_LENGTH_FACTOR = 0.65;

function scaleFor(state: EditHandleProps["state"]): number {
  if (state === "hover") {
    return HANDLE_HOVER_SCALE;
  }
  if (state === "selected" || state === "dragging") {
    return HANDLE_SELECTED_SCALE;
  }
  return 1;
}

/** A solid ring used as the map editor's draggable point affordance. */
export function EditHandle({
  x,
  y,
  radiusPx = HANDLE_RADIUS_PX,
  state,
  heading,
}: EditHandleProps) {
  const radius = radiusPx * scaleFor(state);
  const tickLength = radiusPx * HANDLE_TICK_LENGTH_FACTOR;
  const directionX = heading === undefined ? 0 : Math.cos(heading);
  const directionY = heading === undefined ? 0 : Math.sin(heading);
  const tickStartX = x + directionX * radius;
  const tickStartY = y + directionY * radius;
  const tickEndX = x + directionX * (radius + tickLength);
  const tickEndY = y + directionY * (radius + tickLength);

  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <circle className={styles.ring} cx={x} cy={y} r={radius} />
      {heading === undefined ? null : (
        <line
          className={styles.tick}
          x1={tickStartX}
          y1={tickStartY}
          x2={tickEndX}
          y2={tickEndY}
        />
      )}
    </g>
  );
}
