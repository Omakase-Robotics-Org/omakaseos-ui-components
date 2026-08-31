/**
 * @file EditSnapGuide -- the visible evidence that a position was snapped.
 *
 * Direct-manipulation layer. A snap that happens silently is a coordinate
 * changed behind the operator's back, and these are real measured poses, so
 * every snap says what it caught: a mark at the caught position, and (where the
 * host passes one) a hairline back to what caught it.
 *
 * `kind` mirrors the grammar's own `SnapEvidence["kind"]` exactly, so a host
 * forwards the evidence it was handed instead of re-deciding what happened:
 *
 *  - `vertex` -- an existing point. A PLUS: the sharpest mark available.
 *  - `edge` -- a point on a line. A CROSS (the same two bars, rotated). It used
 *    to be a small filled square, which is now what an anchor is: a mark may
 *    not wear a position's shape, or "evidence" and "vertex" look alike at the
 *    exact moment they are drawn on top of each other.
 *  - `align` -- an axis shared with another point. The mark is the line itself,
 *    so `from`/`to` carry the whole meaning.
 *  - `grid` -- a declared grid intersection. A dot, the quietest mark, because
 *    the grid is everywhere and must not shout.
 *
 * A mark is drawn over the anchor it caught, so it is the largest thing in the
 * vocabulary (`--ds-edit-snap-mark-half`, three anchor edges across) -- and it
 * is transient, which is what licenses that. Its size is a token, not a prop:
 * the host no longer states it and no state or modality varies it.
 *
 * Call-shape policy: one geometry-and-kind call shape; no passthrough SVG
 * props are accepted.
 *
 * Cross-app constraint: mark and guide are the existing --ds-accent register,
 * legible on the fully desaturated inspection host as shape and contrast.
 */
import {
  IDENTITY_UNITS_PER_PIXEL,
  affordancePlacement,
} from "./EditAffordancePlacement";
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
  /** The host's user units per screen pixel; 1 when the surface is in pixels. */
  unitsPerPixel?: number;
};

/** A snap mark with an optional guide line to what it snapped to. */
export function EditSnapGuide({
  at,
  kind,
  from,
  to,
  unitsPerPixel = IDENTITY_UNITS_PER_PIXEL,
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
          vectorEffect="non-scaling-stroke"
        />
      )}
      {kind === "align" ? null : (
        <g className={styles.body} transform={affordancePlacement(at.x, at.y, unitsPerPixel)}>
          {kind === "grid" ? (
            <circle className={styles.dot} data-edit-glyph="snap-grid" />
          ) : (
            <>
              <rect
                className={styles.mark}
                data-edit-glyph={kind === "vertex" ? "snap-vertex" : "snap-edge"}
                transform={kind === "vertex" ? "rotate(0)" : "rotate(45)"}
              />
              <rect
                className={styles.mark}
                transform={kind === "vertex" ? "rotate(90)" : "rotate(-45)"}
              />
            </>
          )}
        </g>
      )}
    </g>
  );
}
