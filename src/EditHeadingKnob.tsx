/**
 * @file EditHeadingKnob — the arm-and-knob affordance for rotating a handle.
 *
 * Direct-manipulation layer. The line keeps the relationship to the edited
 * handle visible; the small grabbable circle at its exact end carries the
 * rotation affordance without words. This is an SVG fragment and the host
 * owns the pointer gesture.
 *
 * Call-shape policy: one geometry/state call shape; no passthrough SVG props
 * are accepted. The knob endpoint is computed from the supplied angle and
 * arm length in the same coordinate system as the host SVG.
 *
 * Cross-app constraint: idle/hover/dragging use the same --ds-* surface and
 * accent registers as EditHandle, so the affordance remains readable on the
 * desaturated inspection host as well as the two branded hosts.
 */
import {
  HANDLE_SELECTED_SCALE,
  KNOB_RADIUS_PX,
} from "./direct-manipulation/constants";
import styles from "./EditHeadingKnob.module.css";

export type EditHeadingKnobProps = {
  x: number;
  y: number;
  angle: number;
  armPx: number;
  radiusPx?: number;
  state: "idle" | "hover" | "dragging";
};

const KNOB_HOVER_SCALE = 1.15;

function scaleFor(state: EditHeadingKnobProps["state"]): number {
  if (state === "hover") {
    return KNOB_HOVER_SCALE;
  }
  if (state === "dragging") {
    return HANDLE_SELECTED_SCALE;
  }
  return 1;
}

/** A heading arm whose endpoint is a grabbable rotation knob. */
export function EditHeadingKnob({
  x,
  y,
  angle,
  armPx,
  radiusPx = KNOB_RADIUS_PX,
  state,
}: EditHeadingKnobProps) {
  const knobX = x + Math.cos(angle) * armPx;
  const knobY = y + Math.sin(angle) * armPx;
  const knobRadius = radiusPx * scaleFor(state);

  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <line className={styles.arm} x1={x} y1={y} x2={knobX} y2={knobY} />
      <circle className={styles.knob} cx={knobX} cy={knobY} r={knobRadius} />
    </g>
  );
}
