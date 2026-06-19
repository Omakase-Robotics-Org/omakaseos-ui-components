/**
 * @file RealtimeEventLog — dev-facing surface that lists every Realtime API
 *       event the consumer has seen, in chronological order.
 *
 * The chat bubbles only render a SUBSET of the Realtime API event stream
 * (`response.output_text.delta`, etc.). Many events (`response.output_audio.delta`,
 * `rate_limits.updated`, `input_audio_buffer.*`) carry useful operational
 * information but no chat-bubble surface. This component is the "we did
 * not throw it away" slot — the event id, type, and a one-line summary
 * line up so an operator can correlate a missing bubble back to the
 * underlying event flow.
 *
 * Rendered as a <ul> with mono font, oldest at top. The consumer is
 * responsible for ordering: the component does NOT sort `entries`, it
 * trusts the array order, but it WILL trim older entries beyond `max`.
 */
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./RealtimeEventLog.module.css";

export type RealtimeEventEntry = {
  /** Stable id for React keying — usually the event_id from Realtime. */
  readonly id: string;
  /** Event type, e.g. "response.output_text.delta". */
  readonly type: string;
  /** Optional timestamp string (consumer-formatted). null hides timestamp. */
  readonly at?: string | null;
  /** Optional one-line summary the consumer composes. */
  readonly summary?: ReactNode;
};

export type RealtimeEventLogProps = HTMLAttributes<HTMLUListElement> & {
  entries: ReadonlyArray<RealtimeEventEntry>;
  /** Trim entries after the most-recent N. Default 200. */
  max?: number;
  /** Accessible label for the list. Default "realtime events". */
  ariaLabel?: string;
};

const DEFAULT_MAX = 200;

export function RealtimeEventLog({
  entries,
  max,
  ariaLabel,
  className,
  ...rest
}: RealtimeEventLogProps) {
  const limit = max ?? DEFAULT_MAX;
  const visible = entries.length > limit ? entries.slice(entries.length - limit) : entries;
  const cls = className ? `${styles.log} ${className}` : styles.log;
  return (
    <ul
      className={cls}
      aria-label={ariaLabel ?? "realtime events"}
      data-testid="realtime-event-log"
      {...rest}
    >
      {visible.map((entry) => (
        <li key={entry.id} className={styles.entry} data-event-type={entry.type}>
          <span className={styles.type}>{entry.type}</span>
          {entry.at === null || entry.at === undefined ? null : (
            <span className={styles.at}>{entry.at}</span>
          )}
          {entry.summary === null || entry.summary === undefined ? null : (
            <span className={styles.summary}>{entry.summary}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
