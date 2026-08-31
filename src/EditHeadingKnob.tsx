/**
 * @file EditHeadingKnob -- the arm-and-knob affordance for rotating a place.
 *
 * Direct-manipulation layer. The arm keeps the relationship to the edited place
 * visible; the small CIRCLE at its exact end carries the rotation affordance
 * without words.
 *
 * The circle is deliberate vocabulary, not decoration: in this layer a square
 * (or its rotated diamond) is a POSITION in the document, and a circle is a
 * handle on a PROPERTY of one -- Illustrator's direction handle. So the knob can
 * never be mistaken for a vertex, and it does not need to be a different size
 * from one to be told apart. It is drawn as the disc inscribed in the anchor
 * square (`--ds-edit-knob-radius`), and it stays that size while hovered and
 * while dragging; the state is the fill.
 *
 * `armPx` is a POSITION, not a size, which is why it stays a prop while the
 * knob's own radius does not: the grammar computes the knob's centre from the
 * same arm length in order to hit-test it (`EditTolerances.headingArmM`), so
 * drawn and picked must read one number.
 *
 * Call-shape policy: one geometry/state call shape; no passthrough SVG props
 * are accepted. The knob endpoint is computed from the supplied angle and arm
 * length in the same coordinate system as the host SVG.
 *
 * Cross-app constraint: idle/hover/dragging use the same --ds-* surface and
 * accent registers as EditHandle, so the affordance remains readable on the
 * desaturated inspection host as well as the two branded hosts.
 */
import {
  IDENTITY_UNITS_PER_PIXEL,
  affordancePlacement,
} from "./EditAffordancePlacement";
import styles from "./EditHeadingKnob.module.css";

export type EditHeadingKnobProps = {
  x: number;
  y: number;
  angle: number;
  /** Distance from the place to its knob, in the host's own user units. */
  armPx: number;
  state: "idle" | "hover" | "dragging";
  /** The host's user units per screen pixel; 1 when the surface is in pixels. */
  unitsPerPixel?: number;
};

/** A heading arm whose endpoint is a grabbable rotation knob. */
export function EditHeadingKnob({
  x,
  y,
  angle,
  armPx,
  state,
  unitsPerPixel = IDENTITY_UNITS_PER_PIXEL,
}: EditHeadingKnobProps) {
  const knobX = x + Math.cos(angle) * armPx;
  const knobY = y + Math.sin(angle) * armPx;

  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      {/* Drawn in host coordinates, so its weight is declared as a screen
          quantity rather than scaled with the surface. */}
      <line
        className={styles.arm}
        x1={x}
        y1={y}
        x2={knobX}
        y2={knobY}
        vectorEffect="non-scaling-stroke"
      />
      <g className={styles.body} transform={affordancePlacement(knobX, knobY, unitsPerPixel)}>
        <circle className={styles.knob} data-edit-glyph="knob" />
      </g>
    </g>
  );
}
