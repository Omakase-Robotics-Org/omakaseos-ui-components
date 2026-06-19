/**
 * @file TypingIndicator — three-dot pulsing animation that fills the gap
 *       between `response.created` and the first `response.output_text.delta`
 *       (or audio_transcript.delta) of a Realtime API turn.
 *
 * The dots pulse in sequence so the indicator reads as "typing" not as
 * "loading spinner". `prefers-reduced-motion` collapses the animation to a
 * static row of dots — still a visual cue, no motion.
 *
 * `role` shifts the dot color to match the awaited bubble, so a stage of
 * "assistant is preparing a response" reads visually consistent with the
 * eventual assistant bubble that replaces this indicator.
 */
import type { HTMLAttributes } from "react";
import type { MessageRole } from "./MessageBubble";
import styles from "./TypingIndicator.module.css";

export type TypingIndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  role?: MessageRole;
  /** Accessible label announced by screen readers; defaults to "typing". */
  ariaLabel?: string;
};

export function TypingIndicator({
  role,
  ariaLabel,
  className,
  ...rest
}: TypingIndicatorProps) {
  const cls = className ? `${styles.indicator} ${className}` : styles.indicator;
  const resolvedRole = role ?? "assistant";
  const label = ariaLabel ?? "typing";
  return (
    <span
      className={cls}
      data-role={resolvedRole}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...rest}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.dot} aria-hidden="true" />
    </span>
  );
}
