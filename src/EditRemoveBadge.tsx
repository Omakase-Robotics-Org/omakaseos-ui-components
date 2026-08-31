/**
 * @file EditRemoveBadge -- the destructive delete affordance for an edit grip.
 *
 * Direct-manipulation layer. A small danger-colored circle with a two-bar
 * multiplication mark. The shape is decorative and the host supplies the native
 * accessible delete control alongside its map overlay; this primitive never
 * becomes an ARIA widget.
 *
 * It is a CONTROL glyph, not an anchor: it is pressed rather than positioned, so
 * it deliberately sits outside the square/diamond position vocabulary and is
 * drawn a full anchor edge in radius (`--ds-edit-badge-radius`, two anchors
 * across) with a mark spanning exactly one anchor edge. Nothing in the layer is
 * distinguished from it by size alone -- the danger register and the cross carry
 * it.
 *
 * Call-shape policy: one geometry call shape with an optional per-instance
 * offset; no passthrough SVG props are accepted. The default offset is owned
 * by the direct-manipulation grammar constants, because WHERE the badge sits is
 * a position (shared with the hit test) rather than a drawn size.
 *
 * Cross-app constraint: danger background and foreground are existing
 * semantic --ds-* tokens, so the badge remains a shape-and-contrast cue on
 * the fully desaturated inspection host too.
 */
import { BADGE_OFFSET_PX } from "./direct-manipulation/constants";
import {
  IDENTITY_UNITS_PER_PIXEL,
  affordancePlacement,
} from "./EditAffordancePlacement";
import styles from "./EditRemoveBadge.module.css";

export type EditRemoveBadgeProps = {
  x: number;
  y: number;
  offsetPx?: {
    x: number;
    y: number;
  };
  state: "idle" | "hover";
  /** The host's user units per screen pixel; 1 when the surface is in pixels. */
  unitsPerPixel?: number;
};

/**
 * A small danger badge with a two-bar remove mark.
 *
 * This is a COARSE-input affordance: a fine pointer has no delete badge at all
 * (it removes with Alt-click, the Delete key, or the host's native control), so
 * nothing destructive floats beside a precise gesture. `hover` exists for the
 * tablet-with-a-mouse case where a coarse-declared surface is nonetheless
 * hovered. Neither state changes its size.
 */
export function EditRemoveBadge({
  x,
  y,
  offsetPx = BADGE_OFFSET_PX,
  state,
  unitsPerPixel = IDENTITY_UNITS_PER_PIXEL,
}: EditRemoveBadgeProps) {
  return (
    <g
      className={`${styles.group} ${styles[state]}`}
      data-state={state}
      aria-hidden="true"
      focusable="false"
    >
      <g
        className={styles.body}
        transform={affordancePlacement(x + offsetPx.x, y + offsetPx.y, unitsPerPixel)}
      >
        <circle className={styles.badge} data-edit-glyph="badge" />
        <rect className={styles.mark} transform="rotate(45)" />
        <rect className={styles.mark} transform="rotate(-45)" />
      </g>
    </g>
  );
}
