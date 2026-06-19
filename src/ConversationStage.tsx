/**
 * @file ConversationStage — the live "stage" surface of a 1:n realtime
 *       conversation, modelled on Google Meet's main view.
 *
 * Layout slots:
 *   - `tiles`  — the participant grid (rendered as a CSS grid; the number
 *                of columns adapts to participant count: 1, 2, 4, 6, 9).
 *   - `caption` — the live caption strip pinned to the bottom of the
 *                stage. Optional: when null / undefined nothing is drawn.
 *
 * What the stage is NOT:
 *   - It is not the past-tense conversation log. That belongs to
 *     <Transcript> + <MessageBubble>.
 *   - It does not own the realtime data flow. Consumers feed `tiles`
 *     and `caption` from their own state (e.g. the realtime-events
 *     reducer).
 *
 * Why a single layout primitive: every consumer that wants Google Meet
 * geometry would otherwise reinvent the same grid math. Centralising it
 * here also means the column-count logic is testable in one spot.
 */
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ConversationStage.module.css";

export type ConversationStageProps = HTMLAttributes<HTMLDivElement> & {
  /** The participant tile elements. The stage counts them via React.Children. */
  tiles: ReactNode;
  /** Number of tiles, used to pick the column count. */
  tileCount: number;
  /** Optional caption strip element. */
  caption?: ReactNode;
  /** Optional toolbar element above the stage (e.g. mute / leave). */
  toolbar?: ReactNode;
  /** Accessible label for the stage region. */
  ariaLabel?: string;
};

/**
 * Pick the column count for a participant grid.
 *
 * Rules — Google Meet's pattern:
 *   1 → 1 col
 *   2 → 2 col
 *   3..4 → 2 col
 *   5..6 → 3 col
 *   7..9 → 3 col
 *   ≥10 → 4 col (capped — the consumer should paginate beyond this)
 */
export function pickStageColumns(count: number): number {
  if (count <= 1) {
    return 1;
  }
  if (count <= 4) {
    return 2;
  }
  if (count <= 9) {
    return 3;
  }
  return 4;
}

export function ConversationStage({
  tiles,
  tileCount,
  caption,
  toolbar,
  ariaLabel,
  className,
  ...rest
}: ConversationStageProps) {
  const cls = className ? `${styles.stage} ${className}` : styles.stage;
  const columns = pickStageColumns(tileCount);
  return (
    <section
      className={cls}
      aria-label={ariaLabel ?? "live conversation"}
      data-tile-count={String(tileCount)}
      data-columns={String(columns)}
      {...rest}
    >
      {toolbar === null || toolbar === undefined ? null : (
        <div className={styles.toolbar}>{toolbar}</div>
      )}
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}
        data-testid="stage-grid"
      >
        {tiles}
      </div>
      {caption === null || caption === undefined ? null : (
        <div className={styles.caption} data-testid="stage-caption">{caption}</div>
      )}
    </section>
  );
}
