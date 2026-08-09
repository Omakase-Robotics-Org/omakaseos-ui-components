/**
 * @file Spinner — a rotating ring that says "this is still running".
 *
 * Status layer. Added in v0.11 for the robot console, where the same ring
 * had been re-implemented three times with three private `@keyframes`
 * (`MapRecordingWizard`'s `RecordingSpinner`, `MapSwitchWizard`'s
 * `SwitchSpinner`, and the tools panel's `fireSpinner` arc). See
 * `omksos_web/reports/rssa-ui-unification/README.md`.
 *
 * Presentational and stateless by construction: it holds no timer and no
 * `useState`. Whether work is in progress is the host's knowledge, so the
 * host decides whether this element is mounted at all. That is also why
 * there is no `spinning` prop — a spinner that is told it is not spinning
 * is a spinner that renders nothing, which is the host's `null` branch,
 * not a state of this component.
 *
 * ## Accessible name
 *
 * `role="status"` with an `ariaLabel` that defaults to `"loading"`, which
 * is the shape `TypingIndicator` (the library's other animated
 * in-progress indicator) already uses. It is deliberately NOT the
 * *required* `ariaLabel` of `ToggleSwitch`: a switch's name says WHICH
 * flag it toggles and can only come from the caller, whereas every
 * spinner in every surface means the one thing "work is in progress" —
 * a default that is right by default. Hosts that run in another language,
 * or that can say something more precise than "loading" ("recording the
 * map"), pass `ariaLabel`.
 *
 * The ring itself is `aria-hidden`: it is the drawing, not the message.
 *
 * ## Color
 *
 * The moving head is `currentColor` unless a `tone` is given, so a
 * spinner inside a button or a colored surface inherits that surface's
 * ink without a prop (the tools panel's arc relies on exactly this).
 * `tone` names it explicitly from the library's one semantic tone
 * vocabulary — the same union `StatusBadge` takes, so "success" means
 * the same green in both.
 */
import type { BadgeTone } from "./StatusBadge";
import styles from "./Spinner.module.css";

/** Ring diameter. `lg` is the size the console's wizard modals use. */
export type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = {
  size?: SpinnerSize;
  /** Colors the moving head; omitted, the head is `currentColor`. */
  tone?: BadgeTone;
  /** Accessible name announced by screen readers; defaults to "loading". */
  ariaLabel?: string;
};

/** A rotating ring announcing that work is in progress. */
export function Spinner({ size = "md", tone, ariaLabel }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      data-size={size}
      data-tone={tone}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? "loading"}
    >
      <span className={styles.ring} aria-hidden="true" />
    </span>
  );
}
