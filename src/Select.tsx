/**
 * @file Select — single-choice dropdown using the native <select>.
 *
 * Native is the right pick: ARIA, keyboard, mobile picker, accessibility
 * tree, and IME composition all come for free. We only re-skin the
 * appearance and overlay the chevron via CSS background-image.
 *
 * For multi-select or async-search dropdowns, build a separate Combobox
 * component (out of scope for v0.3.0).
 */
import type { SelectHTMLAttributes, ReactNode } from "react";
import styles from "./Select.module.css";

export type SelectSize = "sm" | "md" | "lg";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  selectSize?: SelectSize;
  invalid?: boolean;
  children: ReactNode;
};

/**
 * Native <select> with the chevron overlaid. All extra props (data-*,
 * aria-*, name, form, etc.) flow to the underlying <select>. The wrap
 * span is a styling-only container with no addressable attributes — to
 * locate the control from the outside, target the <select> directly.
 */
export function Select({
  selectSize,
  invalid,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <span
      className={styles.wrap}
      data-size={selectSize ?? "md"}
      data-invalid={invalid ? "true" : undefined}
    >
      <select
        className={className ? `${styles.select} ${className}` : styles.select}
        aria-invalid={invalid ? "true" : undefined}
        {...rest}
      >
        {children}
      </select>
      <span className={styles.chevron} aria-hidden="true" />
    </span>
  );
}
