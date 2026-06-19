/**
 * @file LiveCaption — single utterance shown in the live caption strip
 *       below a ConversationStage.
 *
 * Visual model is Google Meet's caption: speaker name + currently-spoken
 * text on a dark strip. Caps to 2 lines; older captions are off-screen
 * (a transcript-log surface should also be running for the full history).
 *
 * Distinction from MessageBubble: a bubble is a finalized turn in the
 * past-tense log; a caption is the ephemeral live display of the current
 * (or just-finished) utterance, intended to be replaced as new
 * `output_text.delta` / `audio_transcript.delta` events arrive.
 */
import type { HTMLAttributes, ReactNode } from "react";
import type { MessageRole } from "./MessageBubble";
import styles from "./LiveCaption.module.css";

export type LiveCaptionProps = HTMLAttributes<HTMLDivElement> & {
  /** Display name of the speaker. */
  speaker: string;
  /** Domain role of the speaker — drives caption color tinting. */
  role: MessageRole;
  /** The current utterance text. Empty string is allowed (renders empty). */
  text: ReactNode;
  /** Show the caret to signal an in-progress utterance. */
  streaming?: boolean;
};

export function LiveCaption({
  speaker,
  role,
  text,
  streaming,
  className,
  ...rest
}: LiveCaptionProps) {
  const cls = className ? `${styles.caption} ${className}` : styles.caption;
  const dataStreaming = streaming ? "true" : undefined;
  return (
    <div
      className={cls}
      data-role={role}
      data-streaming={dataStreaming}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <span className={styles.speaker}>{speaker}</span>
      <span className={styles.text}>
        {text}
        {streaming ? (
          <span
            className={styles.caret}
            aria-hidden="true"
            data-testid="live-caption-caret"
          />
        ) : null}
      </span>
    </div>
  );
}
