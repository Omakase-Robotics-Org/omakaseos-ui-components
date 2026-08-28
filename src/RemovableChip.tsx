/**
 * @file RemovableChip — a dismissable chip rendered as one button.
 *
 * Form layer. The whole chip is one press target: it is one tab stop, and the
 * native button's Enter / Space behavior dismisses it. Splitting the visible
 * label and × into separate controls would double the tab stops without
 * adding an action — there is nothing to do on a chip other than dismiss it.
 * `role="listitem"` keeps the chip's list-entry semantics on that same
 * focusable button.
 *
 * `RankChip` in this library is a DIFFERENT object: a non-interactive
 * rank-notation tile whose weight carries ordering. The two must not be
 * merged, and no umbrella `Chip` exists on purpose. This is an accepted
 * sibling relationship.
 *
 * `removeAriaLabel` owns the accessible name and therefore the locale. When
 * `disabled` is true, the chip stays focusable and uses `aria-disabled` rather
 * than the native `disabled` attribute; the click guard also covers keyboard
 * activation. This lets a future token-input host disable the whole control
 * without moving focus to the body.
 */
import styles from "./RemovableChip.module.css";

export function RemovableChip(props: {
  /** Visible chip text. Long values truncate with ellipsis. */
  label: string;
  /** Fires when the chip is clicked / Enter / Space. */
  onRemove: () => void;
  /** Accessible name (e.g. "Remove Org: Acme"). Caller owns the locale. */
  removeAriaLabel: string;
  /** Inert chip: onRemove is not invoked, cursor is not-allowed, aria-disabled set. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="listitem"
      className={styles.chip}
      aria-label={props.removeAriaLabel}
      aria-disabled={props.disabled ? "true" : undefined}
      onClick={props.disabled ? undefined : props.onRemove}
    >
      <span className={styles.label}>{props.label}</span>
      <span className={styles.remove} aria-hidden="true">
        ×
      </span>
    </button>
  );
}
