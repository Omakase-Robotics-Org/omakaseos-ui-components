/**
 * @file ReservedText — a text slot that occupies the same height whether it
 * has something to say or nothing at all.
 *
 * Status layer. Promoted in v0.10 from `robot-status-server-app`
 * (`src/components/ui/ReservedText.tsx`). See
 * `omksos_web/reports/ui-primitives-promotion/README.md`.
 *
 * A live screen states conditions as they arise: a guard rejection, a
 * refused request, a runtime that is not up. Rendering those lines
 * conditionally makes every panel below them jump the moment one appears,
 * which on a teleoperation screen moves a button out from under a pointer
 * that was already travelling to it. This slot is therefore laid out for
 * its declared number of lines up front and keeps that height empty when
 * there is no text; content longer than the reservation scrolls inside the
 * slot instead of growing it.
 */
import type { ReactNode } from "react";
import styles from "./ReservedText.module.css";

/** How the line reads: an ordinary state, or something the operator must act on. */
export type ReservedTextTone = "muted" | "warning";

export type ReservedTextProps = {
  /** How many lines of text the slot is laid out for. */
  lines?: number;
  tone?: ReservedTextTone;
  children?: ReactNode;
};

/** A fixed-height text slot, sized for `lines` lines of its own font size. */
export function ReservedText({ lines = 1, tone = "muted", children }: ReservedTextProps): ReactNode {
  return (
    <div
      className={styles.slot}
      data-tone={tone}
      style={{ height: `calc(${lines} * var(--reserved-line-height))` }}
    >
      {children}
    </div>
  );
}
