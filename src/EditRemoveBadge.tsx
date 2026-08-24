/**
 * @file EditRemoveBadge — the destructive delete affordance for an edit grip.
 *
 * Direct-manipulation layer. This SVG fragment is a small danger-colored
 * circle with a two-stroke multiplication mark. The shape is decorative and
 * the host supplies the native accessible delete control alongside its map
 * overlay; this primitive never becomes an ARIA widget.
 *
 * Call-shape policy: one geometry call shape with an optional per-instance
 * offset; no passthrough SVG props are accepted. The default offset is owned
 * by the direct-manipulation grammar constants.
 *
 * Cross-app constraint: danger background and foreground are existing
 * semantic --ds-* tokens, so the badge remains a shape-and-contrast cue on
 * the fully desaturated inspection host too.
 */
import {
  BADGE_OFFSET_PX,
  BADGE_RADIUS_PX,
} from "./direct-manipulation/constants";
import styles from "./EditRemoveBadge.module.css";

export type EditRemoveBadgeProps = {
  x: number;
  y: number;
  radiusPx?: number;
  offsetPx?: {
    x: number;
    y: number;
  };
};

const MARK_HALF_FACTOR = 0.42;

/** A small danger badge with a two-stroke remove mark. */
export function EditRemoveBadge({
  x,
  y,
  radiusPx = BADGE_RADIUS_PX,
  offsetPx = BADGE_OFFSET_PX,
}: EditRemoveBadgeProps) {
  const badgeX = x + offsetPx.x;
  const badgeY = y + offsetPx.y;
  const markHalf = radiusPx * MARK_HALF_FACTOR;

  return (
    <g className={styles.group} aria-hidden="true" focusable="false">
      <circle className={styles.badge} cx={badgeX} cy={badgeY} r={radiusPx} />
      <path
        className={styles.mark}
        d={`M ${badgeX - markHalf} ${badgeY - markHalf} L ${badgeX + markHalf} ${badgeY + markHalf}`}
      />
      <path
        className={styles.mark}
        d={`M ${badgeX + markHalf} ${badgeY - markHalf} L ${badgeX - markHalf} ${badgeY + markHalf}`}
      />
    </g>
  );
}
