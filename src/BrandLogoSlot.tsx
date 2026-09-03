/**
 * @file BrandLogoSlot — the single SoT for mounting the brand logo.
 *
 * `BrandLogo` is the SoT for the artwork; `BrandLogoSlot` is the SoT for how
 * it sits in a surface — the gutter around it, its alignment with whatever
 * sibling column is below it, and the "one padding owns each gap" rule that
 * keeps the logo from floating in a compounded whitespace channel.
 *
 * Consumers place `<BrandLogoSlot variant="..." />` inside their container
 * instead of a bare `<BrandLogo />` wrapped in ad-hoc padding CSS, so every
 * surface renders the logo with the same rhythm. Promoted verbatim (variant
 * behavior and prop shape both unchanged) from
 * `robot-operations-web-service`'s
 * `packages/web/src/modules/brand/BrandLogoSlot.tsx` — see
 * `BrandLogoSlot.module.css`'s file header for the one thing that DID change
 * (the two paddings' `--ds-*` token mapping).
 *
 * Variants:
 * - `inline` — the logo lives in a vertical stack above a nav column of
 *   20px icons in 12px-padded rows (the standard sidebar layout). Its
 *   center aligns with that icon column (parent-inset 12 + row-padding 12 +
 *   icon-half 10 = 34px; slot: parent-inset 12 + slot-padding-left 8 +
 *   logo-half 14 = 34px), and it owns the whole gap BELOW itself so no
 *   compounding happens with the nav's top inset.
 * - `centered` — the logo lives in a narrow vertical rail with no icon
 *   column to line up with (a collapsed sidebar rail). Same bottom-only
 *   gutter as `inline`; no inline padding.
 * - `header` — the logo lives on a wide horizontal header row next to other
 *   row items. No inline padding, no bottom gutter: the header row owns its
 *   own paddings, and the flex parent handles spacing between items via its
 *   own `gap`.
 */
import { BrandLogo, type BrandLogoProps } from "./BrandLogo";
import styles from "./BrandLogoSlot.module.css";

/** How the slot places the logo in its surface. */
export type BrandLogoSlotVariant = "inline" | "centered" | "header";

export type BrandLogoSlotProps = BrandLogoProps & {
  variant: BrandLogoSlotVariant;
};

/** Mount the brand logo with the shared gutter/alignment SoT. */
export function BrandLogoSlot({ variant, alt }: BrandLogoSlotProps) {
  return (
    <div className={styles.slot} data-variant={variant}>
      <BrandLogo alt={alt} />
    </div>
  );
}
