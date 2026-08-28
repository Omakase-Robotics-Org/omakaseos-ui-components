/**
 * @file EditSnapGuide — the visible evidence that a position was snapped.
 *
 * Direct-manipulation layer. A snap that happens silently is a coordinate
 * changed behind the operator's back, and these are real measured poses, so
 * every snap says what it caught: a mark at the caught position, and (where the
 * host passes one) a hairline back to what caught it.
 *
 * `kind` mirrors the grammar's own `SnapEvidence["kind"]` exactly, so a host
 * forwards the evidence it was handed instead of re-deciding what happened:
 *
 *  - `vertex` — an existing point. A cross, the sharpest mark available.
 *  - `edge` — a point on a line. A small square sitting on that line.
 *  - `align` — an axis shared with another point. The mark is the line itself,
 *    so `from`/`to` carry the whole meaning.
 *  - `grid` — a declared grid intersection. A dot, the quietest mark, because
 *    the grid is everywhere and must not shout.
 *
 * Call-shape policy: one geometry-and-kind call shape; no passthrough SVG
 * props are accepted.
 *
 * Cross-app constraint: mark and guide are the existing --ds-accent register,
 * legible on the fully desaturated inspection host as shape and contrast.
 */
import styles from "./EditSnapGuide.module.css";

type Point = { x: number; y: number };

export type EditSnapGuideProps = {
  /** The snapped position. */
  at: Point;
  /** Which kind of snap caught it; the same vocabulary as `SnapEvidence`. */
  kind: "vertex" | "edge" | "align" | "grid";
  /** One end of the optional hairline back to what caught the position. */
  from?: Point;
  /** The other end of that hairline. */
  to?: Point;
  /** Half-size of the mark, in host units. */
  sizePx?: number;
};

const SNAP_MARK_HALF_PX = 5;

/** A snap mark with an optional guide line to what it snapped to. */
export function EditSnapGuide({
  at,
  kind,
  from,
  to,
  sizePx = SNAP_MARK_HALF_PX,
}: EditSnapGuideProps) {
  return (
    <g
      className={`${styles.group} ${styles[kind]}`}
      data-state={kind}
      aria-hidden="true"
      focusable="false"
    >
      {from === undefined || to === undefined ? null : (
        <line
          className={styles.guide}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeDasharray="3 3"
        />
      )}
      {kind === "vertex" ? (
        <>
          <line
            className={styles.mark}
            x1={at.x - sizePx}
            y1={at.y}
            x2={at.x + sizePx}
            y2={at.y}
          />
          <line
            className={styles.mark}
            x1={at.x}
            y1={at.y - sizePx}
            x2={at.x}
            y2={at.y + sizePx}
          />
        </>
      ) : null}
      {kind === "edge" ? (
        <rect
          className={styles.tile}
          x={at.x - sizePx}
          y={at.y - sizePx}
          width={sizePx * 2}
          height={sizePx * 2}
        />
      ) : null}
      {kind === "grid" ? <circle className={styles.dot} cx={at.x} cy={at.y} r={sizePx / 2} /> : null}
    </g>
  );
}
