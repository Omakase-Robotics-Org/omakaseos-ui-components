/**
 * @file Textarea — multi-line text input shell.
 *
 * Like Input, this is a thin wrapper around the native element. It does NOT
 * auto-resize on content (consumers can compose with a third-party autosize
 * hook); the height is governed by the `rows` HTML attribute. The component
 * accepts an `invalid` flag for parity with Input.
 */
import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid, className, rows, ...rest }: TextareaProps) {
  return (
    <textarea
      className={className ? `${styles.textarea} ${className}` : styles.textarea}
      data-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? "true" : undefined}
      rows={rows ?? 3}
      {...rest}
    />
  );
}
