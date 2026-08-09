/**
 * @file StatusBadge — pill-shaped badge with semantic tones and optional pulse.
 *
 * The neutral API merges status_server_webui's `variant` (running/stopped/...)
 * and source/packages/web's `tone` (success/warning/...) into a single
 * meaning-bearing token. Consumers map domain enums (running → success,
 * failed → danger, stopped → neutral) at the edge.
 *
 * Both call shapes are accepted:
 *   <StatusBadge tone="success" label="Live" />     // omks-robo/web style
 *   <StatusBadge tone="success">Live</StatusBadge>  // status_server_webui style
 * `children` wins if both are given.
 *
 * `BadgeTone` is the library's single semantic tone vocabulary — named for
 * this, its first consumer, but shared by every primitive that states a
 * register (`Toast`, `Spinner`). One union, so "success" is the same green
 * wherever it appears and a consumer maps its domain enum exactly once.
 *
 * ## `live` (v0.11)
 *
 * Opt-in, and off by default. A badge that merely LABELS something (a
 * robot's name, a fixed capability) is not a live region, and a page full
 * of them would announce on every re-render; but a badge that reports a
 * value as it changes (a connection that just dropped) should be announced
 * when it changes. Only the call site knows which of the two it is, so it
 * says so. The default stays role-less, which is what every existing call
 * site in both apps already renders.
 */
import type { ReactNode } from "react";
import styles from "./StatusBadge.module.css";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";
export type BadgeSize = "sm" | "md";

export type StatusBadgeProps = {
  tone: BadgeTone;
  pulse?: boolean;
  size?: BadgeSize;
  label?: ReactNode;
  children?: ReactNode;
  /**
   * Mark the badge as a live region (`role="status"`) so a change to its
   * content is announced. Use it where the badge reports changing state,
   * not where it labels something fixed. Default: off.
   */
  live?: boolean;
};

export function StatusBadge({ tone, pulse, size, label, children, live }: StatusBadgeProps) {
  const content = children ?? label;
  return (
    <span
      className={styles.badge}
      data-tone={tone}
      data-size={size === "sm" ? "sm" : undefined}
      role={live ? "status" : undefined}
    >
      {/* The dot is the tone rendered twice — it says nothing the badge's
          own text and tone do not already say. */}
      {pulse ? <span className={styles.dot} data-pulse="true" aria-hidden="true" /> : null}
      {content}
    </span>
  );
}
