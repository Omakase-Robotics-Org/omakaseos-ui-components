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
};

export function StatusBadge({ tone, pulse, size, label, children }: StatusBadgeProps) {
  const content = children ?? label;
  return (
    <span
      className={styles.badge}
      data-tone={tone}
      data-size={size === "sm" ? "sm" : undefined}
    >
      {pulse ? <span className={styles.dot} data-pulse="true" /> : null}
      {content}
    </span>
  );
}
