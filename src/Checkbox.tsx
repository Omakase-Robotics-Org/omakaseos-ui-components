/**
 * @file Checkbox — controlled tri-state native checkbox + optional label.
 *
 * Native <input type="checkbox"> is the basis. The component exposes the
 * same `checked` / `defaultChecked` / `onChange` API as the underlying
 * element. Indeterminate state is set via ref (React does not pass it as
 * an attribute), driven here by an `indeterminate` prop.
 *
 * The label is a sibling, NOT wrapped in <label>: this keeps the text
 * selectable independently and avoids the native "click anywhere on the
 * row" behavior that conflicts with row-level click handlers in tables.
 * Consumers that want click-anywhere should wrap with their own <label>.
 */
import { useEffect, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  indeterminate?: boolean;
  label?: ReactNode;
};

export function Checkbox({
  indeterminate,
  label,
  className,
  id,
  ...rest
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate === true;
    }
  }, [indeterminate]);

  const inputCls = className ? `${styles.input} ${className}` : styles.input;
  const inputEl = (
    <input ref={ref} type="checkbox" className={inputCls} id={id} {...rest} />
  );

  if (label === undefined) {
    return inputEl;
  }
  return (
    <span className={styles.row}>
      {inputEl}
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </span>
  );
}
