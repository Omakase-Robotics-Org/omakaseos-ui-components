/**
 * @file SearchInput — box-owns-the-chrome search field for one prominent
 * search affordance (list-page headers, command bars).
 *
 * Ported from the dashboard FilterBar's `prominent` register (the
 * `.prominentSearch` / `.prominentSearchIcon` / `.prominentSearchInput`
 * rules): the outer BOX draws the border, radius, background and the
 * `:focus-within` ring; the inner `<input>` is borderless (`outline: none`,
 * `min-width: 0`) so the ring frames the whole affordance — magnifier
 * included — not just the text field.
 *
 * `type="text"` is a hard rule, not a default: there is no `type` prop to
 * override it. `type="search"` maps to the ARIA `searchbox` role, and this
 * library's own specs (and every consumer's focus-retention harness) find
 * this control as a `textbox` — changing how the control DRAWS must not
 * change what it IS.
 *
 * Dedup note: `Input` is a bordered control with no adornment slot — the
 * box IS the input there. Here the outer box draws and the inner input is
 * bare, so a magnifier can sit inside the same border without a second
 * nested control. `AsyncCombobox` is a synthetic listbox widget (its own
 * ARIA role, a candidate list, keyboard navigation) — this is a plain
 * textbox with a decorative icon, nothing synthetic. `Toolbar` is a row
 * that can CONTAIN a search field; it does not own one itself. `Field` is
 * the labeled-wrapper pattern (visible label + control) — SearchInput is
 * deliberately label-less (the box has no room for a label above it),
 * which is why `ariaLabel` is required rather than optional.
 */
import type { ChangeEvent } from "react";
import styles from "./SearchInput.module.css";

export type SearchInputSize = "md" | "lg";

/** Props for {@link SearchInput}. */
export type SearchInputProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Required — the box has no visible label. */
  readonly ariaLabel: string;
  readonly placeholder?: string;
  /** `md` = `--ds-control-height-md`; `lg` = the library's tallest control rung (see the file header's token note in SearchInput.module.css). */
  readonly size?: SearchInputSize;
};

/** Box-owns-the-chrome search field. See the file header for the `type="text"` rule. */
export function SearchInput(props: SearchInputProps) {
  const { value, onChange, ariaLabel, placeholder, size } = props;
  return (
    <div className={styles.box} data-size={size ?? "md"}>
      <svg
        className={styles.icon}
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3.5 3.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </div>
  );
}
