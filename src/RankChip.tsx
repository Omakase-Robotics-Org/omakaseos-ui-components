/**
 * @file RankChip — a rank written as a short token, weighted by its level.
 *
 * Status layer. Added in v0.15 alongside `StatusGlyph`, for the same reason:
 * on the acceptance-inspection host (robot-inspection-web) a desaturated
 * palette cannot spend hue on ordering, so three levels are separated by
 * WEIGHT — filled, outlined, dashed. See
 * `omksos_web/reports/ui-components-inspect-theme/README.md`.
 *
 * | rank     | fill        | border | ink            |
 * | -------- | ----------- | ------ | -------------- |
 * | `high`   | accent      | accent | inverted       |
 * | `medium` | none        | solid  | primary text   |
 * | `low`    | none        | dashed | muted text     |
 *
 * The three read as an ordering even printed in greyscale, because filled is
 * heavier than outlined is heavier than dashed. Reversing that (a dashed
 * "high") would make the ordering unreadable, which is why `rank` is a closed
 * union of three and not a free number.
 *
 * ## Why the caller writes the token
 *
 * The chip holds one or two characters and the library does not know what
 * they are: an inspection checklist ranks `A`/`B`/`C`, a defect log ranks
 * `1`/`2`/`3`, a Japanese sheet writes 高/中/低. Passing the rank AND the
 * character it is written as keeps the ordering (`rank`, which drives the
 * weight) separate from the notation (`children`, which is domain), so a
 * consumer that renames its notation does not restyle its chips.
 *
 * Both call shapes are accepted, matching `StatusBadge`:
 *   <RankChip rank="high" label="A" />
 *   <RankChip rank="high">A</RankChip>
 * `children` wins if both are given.
 *
 * ## Accessible name
 *
 * `ariaLabel` is optional here, unlike `StatusGlyph`'s: the chip's visible
 * token IS text, so it already has an accessible name. Pass `ariaLabel` where
 * the notation is not self-describing out loud ("A" announced alone says
 * nothing; `ariaLabel="priority A"` does).
 */
import type { ReactNode } from "react";
import styles from "./RankChip.module.css";

/** Three levels of emphasis, ordered. Not a number: see the file header. */
export type RankLevel = "high" | "medium" | "low";

/** Chip side length. `md` (24px) sits on a table row's line box. */
export type RankChipSize = "sm" | "md";

export type RankChipProps = {
  rank: RankLevel;
  size?: RankChipSize;
  /** The character(s) the rank is written as. Alternative to `children`. */
  label?: ReactNode;
  children?: ReactNode;
  /** Spoken name, where the visible notation does not say enough on its own. */
  ariaLabel?: string;
};

/** A rank as a small square tile, weighted by level. */
export function RankChip({ rank, size = "md", label, children, ariaLabel }: RankChipProps) {
  const content = children ?? label;
  return (
    <span
      className={styles.chip}
      data-rank={rank}
      data-size={size}
      aria-label={ariaLabel}
    >
      {content}
    </span>
  );
}
