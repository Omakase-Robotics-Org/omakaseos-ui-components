/**
 * @file MessageBubble — one chat turn rendered as a bubble.
 *
 * The role vocabulary is OpenAI Realtime's: "user" / "assistant" / "system" / "tool".
 * Every consuming app must map its own domain enum to this set at the edge —
 * that is the single source of truth for chat semantics across both apps.
 *
 * Layout rules (alignment by role):
 *   - assistant            → align left, max-width: 80%
 *   - user                 → align right, max-width: 80%
 *   - system / tool        → full-width (max-width: 100%)
 * `align="left"|"right"|"auto"` overrides the role default. `align="auto"` is
 * the default and resolves from role.
 *
 * Streaming:
 *   `streaming === true` makes the bubble append a blinking caret after the
 *   children. The caret is purely decorative; screen readers do NOT see it
 *   (`aria-hidden="true"`) — the live region announces the streaming text
 *   itself, not "caret".
 *
 * Timestamp:
 *   `timestamp` is a free-form short string the consumer formats. The
 *   library does not opine on date formatting (locale, relative vs absolute)
 *   because the two consuming apps have different policies. When `null` or
 *   `undefined`, no timestamp line renders.
 *
 * Tone:
 *   `tone` is for system/tool bubbles that need to read as warning/danger/etc.
 *   It overlays a tinted border without changing the bubble background.
 */
import type { HTMLAttributes, ReactNode } from "react";
import type { BadgeTone } from "./StatusBadge";
import styles from "./MessageBubble.module.css";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessageAlign = "auto" | "left" | "right";

export type MessageBubbleProps = HTMLAttributes<HTMLDivElement> & {
  role: MessageRole;
  /** When true, append a blinking caret at the end of the content. */
  streaming?: boolean;
  /** Free-form short string. Consumer-formatted; null/undefined hides it. */
  timestamp?: string | null;
  /** Override the role-based alignment. */
  align?: MessageAlign;
  /** Override the implicit role label (e.g. "Customer" vs "user"). */
  roleLabel?: ReactNode;
  /** Optional semantic tone overlay (mostly for system/tool warnings). */
  tone?: BadgeTone;
  children: ReactNode;
};

function resolveAlign(role: MessageRole, override: MessageAlign | undefined): "left" | "right" | "full" {
  if (override === "left") {
    return "left";
  }
  if (override === "right") {
    return "right";
  }
  if (role === "user") {
    return "right";
  }
  if (role === "assistant") {
    return "left";
  }
  return "full";
}

export function MessageBubble({
  role,
  streaming,
  timestamp,
  align,
  roleLabel,
  tone,
  className,
  children,
  ...rest
}: MessageBubbleProps) {
  const resolvedAlign = resolveAlign(role, align);
  const cls = className ? `${styles.row} ${className}` : styles.row;
  const dataStreaming = streaming ? "true" : undefined;
  const label = roleLabel === undefined ? role : roleLabel;
  return (
    <div
      className={cls}
      data-role={role}
      data-align={resolvedAlign}
      data-streaming={dataStreaming}
      data-tone={tone}
      {...rest}
    >
      <div className={styles.bubble}>
        <div className={styles.meta}>
          <span className={styles.role}>{label}</span>
          {timestamp === null || timestamp === undefined ? null : (
            <span className={styles.timestamp}>{timestamp}</span>
          )}
        </div>
        <div className={styles.body}>
          {children}
          {streaming ? (
            <span className={styles.caret} aria-hidden="true" data-testid="streaming-caret" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
