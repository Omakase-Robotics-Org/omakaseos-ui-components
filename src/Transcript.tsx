/**
 * @file Transcript — vertical stack of MessageBubble (and TypingIndicator,
 *       ToolCallTrace, etc).
 *
 * Renders an ordered list (<ol>) so the chronological order is part of the
 * accessibility tree. The semantic order matters: a screen reader following
 * the list reads turns in the order they happened.
 *
 * Children are rendered as-is; the consumer wraps each turn in whatever
 * primitive fits (MessageBubble for utterances, ToolCallTrace for tool
 * calls, system bubbles for lifecycle). The list's role is layout + a11y,
 * not policy on what each row contains.
 */
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Transcript.module.css";

export type TranscriptProps = HTMLAttributes<HTMLOListElement> & {
  ariaLabel?: string;
  children: ReactNode;
};

export function Transcript({ ariaLabel, className, children, ...rest }: TranscriptProps) {
  const cls = className ? `${styles.list} ${className}` : styles.list;
  return (
    <ol className={cls} aria-label={ariaLabel} {...rest}>
      {(Array.isArray(children) ? children : [children]).map((child, idx) => (
        <li key={idx} className={styles.item}>
          {child}
        </li>
      ))}
    </ol>
  );
}
