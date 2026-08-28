/**
 * @file EditRubberBand — the line from a run's last point to the pointer.
 *
 * Direct-manipulation layer. While a route or an area is being drawn, this is
 * the only thing that says where the next point would land, which is what makes
 * a continuous placement rhythm possible at all: the operator reads the next
 * leg before committing it.
 *
 * `state` reports whether the 45-degree constraint is in force, because a
 * constrained band that looks identical to a free one hides the modifier's
 * effect until after the click.
 *
 * `closeTo` draws the second, dashed leg back to a ring's first point - the
 * closing preview an area needs, since an area must be closed to exist.
 *
 * Call-shape policy: one geometry-and-state call shape; no passthrough SVG
 * props are accepted.
 *
 * Cross-app constraint: both legs use the existing --ds-accent register, so the
 * preview stays visible on the fully desaturated inspection host.
 */
import styles from "./EditRubberBand.module.css";

type Point = { x: number; y: number };

export type EditRubberBandProps = {
  /** The run's last placed point. */
  from: Point;
  /** Where the next point would land (already constrained and snapped). */
  to: Point;
  state: "free" | "constrained";
  /** A ring's first point, when closing is being previewed. */
  closeTo?: Point;
};

/** The pending leg of a run, with an optional closing preview. */
export function EditRubberBand({ from, to, state, closeTo }: EditRubberBandProps) {
  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <line className={styles.band} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      {closeTo === undefined ? null : (
        <line
          className={styles.closing}
          x1={to.x}
          y1={to.y}
          x2={closeTo.x}
          y2={closeTo.y}
          strokeDasharray="4 4"
        />
      )}
    </g>
  );
}
