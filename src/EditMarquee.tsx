/**
 * @file EditMarquee — the rubber-band rectangle of a multi-select gesture.
 *
 * Direct-manipulation layer. A dashed outline over a barely-there wash: the
 * rectangle must be legible against a map raster without hiding what it is
 * selecting. The host owns the gesture and decides what falls inside (a
 * perspective host answers that in its own screen frame); this component only
 * draws the two corners it is given, in either order.
 *
 * Call-shape policy: one geometry call shape, two corners; no passthrough SVG
 * props are accepted, because the fragment's hidden, non-focusable boundary is
 * part of the contract.
 *
 * The rectangle has no body of its own to size: it spans two host positions, so
 * the only DRAWN quantities are its outline weight and its dash rhythm, and both
 * are --ds-edit-* tokens declared once in src/tokens.css (the same "not yet
 * real" dash the insertion ghost and the pending leg use). `non-scaling-stroke`
 * makes them screen quantities, so the outline does not fatten with the zoom.
 *
 * Cross-app constraint: outline and wash are existing --ds-* accent registers,
 * so the rectangle stays visible on the fully desaturated inspection host.
 */
import styles from "./EditMarquee.module.css";

type Point = { x: number; y: number };

export type EditMarqueeProps = {
  /** Where the press landed. */
  from: Point;
  /** Where the pointer is now. Either corner may be the smaller one. */
  to: Point;
};

/** A dashed selection rectangle spanned by two corners. */
export function EditMarquee({ from, to }: EditMarqueeProps) {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const width = Math.abs(to.x - from.x);
  const height = Math.abs(to.y - from.y);

  return (
    <g className={styles.group} aria-hidden="true" focusable="false">
      <rect
        className={styles.rect}
        x={x}
        y={y}
        width={width}
        height={height}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
