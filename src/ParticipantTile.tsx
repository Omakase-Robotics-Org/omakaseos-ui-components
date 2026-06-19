/**
 * @file ParticipantTile — one participant in a live 1:n conversation.
 *
 * Visual model is Google Meet's tile: a rectangular surface with the
 * participant's display name, an optional avatar slot, and signals for
 * `speaking` (a colored ring around the tile) and `connection` (a small
 * indicator on the corner). The tile is purely presentational — joining,
 * leaving, audio routing are the consumer's responsibility.
 *
 * Distinction from MessageBubble: a bubble represents one utterance in a
 * past-tense transcript; a tile represents a participant in the live
 * stage and persists for the duration of the call regardless of who is
 * speaking right now.
 */
import type { HTMLAttributes, ReactNode } from "react";
import type { MessageRole } from "./MessageBubble";
import styles from "./ParticipantTile.module.css";

export type ParticipantTileProps = HTMLAttributes<HTMLDivElement> & {
  /** Display name. Long names truncate with ellipsis. */
  name: string;
  /**
   * Domain role of this participant. Reuses MessageRole so a tile and a
   * bubble that represent the same speaker are always visually consistent
   * (both share the role-tinted accent).
   */
  role: MessageRole;
  /** True while this participant has the floor (will draw the speaking ring). */
  speaking?: boolean;
  /** True when this participant's connection is live; false when dropped. */
  connected?: boolean;
  /** Optional avatar / video slot (rendered above the name strip). */
  avatar?: ReactNode;
  /** Optional sub-line under the name (e.g. "muted", "screen sharing"). */
  hint?: ReactNode;
};

export function ParticipantTile({
  name,
  role,
  speaking,
  connected,
  avatar,
  hint,
  className,
  ...rest
}: ParticipantTileProps) {
  const cls = className ? `${styles.tile} ${className}` : styles.tile;
  const dataSpeaking = speaking ? "true" : undefined;
  const dataConnected = connected === false ? "false" : "true";
  return (
    <div
      className={cls}
      data-role={role}
      data-speaking={dataSpeaking}
      data-connected={dataConnected}
      {...rest}
    >
      <div className={styles.avatar} data-testid="participant-avatar">
        {avatar}
      </div>
      <div className={styles.nameRow}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.name} title={name}>
          {name}
        </span>
        {hint === null || hint === undefined ? null : (
          <span className={styles.hint}>{hint}</span>
        )}
      </div>
    </div>
  );
}
