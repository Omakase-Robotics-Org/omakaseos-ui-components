/**
 * @file Switch — toggle styled like a physical switch.
 *
 * Built on top of native <input type="checkbox" role="switch"> so screen
 * readers announce "switch, on/off" rather than "checkbox, checked". The
 * visual track + thumb is composed via CSS pseudo-elements; the input
 * itself is opacity 0 but covers the full hit area.
 *
 * Like Checkbox, the optional label is rendered as a sibling. Click on the
 * label still toggles the switch via htmlFor + id.
 */
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Switch.module.css";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label?: ReactNode;
};

export function Switch({ label, className, id, ...rest }: SwitchProps) {
  const trackCls = styles.track;
  const inputCls = className ? `${styles.input} ${className}` : styles.input;
  const switchEl = (
    <span className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        className={inputCls}
        id={id}
        {...rest}
      />
      <span className={trackCls} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </span>
  );

  if (label === undefined) {
    return switchEl;
  }
  return (
    <span className={styles.row}>
      {switchEl}
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </span>
  );
}
