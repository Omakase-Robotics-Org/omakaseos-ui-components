/**
 * @file Slider — single-thumb numeric range using native <input type="range">.
 *
 * Native is the right pick: keyboard arrow handling, page-up/down, mobile
 * touch, ARIA value announcements all work without custom code. We re-skin
 * the track and thumb via CSS pseudo-elements; the value-fill effect (the
 * filled portion left of the thumb) is computed from `value`/`min`/`max`
 * and applied via a CSS custom property.
 *
 * The slider does NOT render a numeric badge or unit by itself — pair it
 * with a sibling element if needed:
 *   <Toolbar><Slider value={v} onChange={…}/><span>{v}%</span></Toolbar>
 */
import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Slider.module.css";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export function Slider({
  label,
  className,
  id,
  min,
  max,
  value,
  defaultValue,
  ...rest
}: SliderProps) {
  const reactId = useId();
  const resolvedId = id ?? reactId;
  const minN = typeof min === "number" ? min : 0;
  const maxN = typeof max === "number" ? max : 100;
  const v = typeof value === "number"
    ? value
    : typeof defaultValue === "number"
      ? defaultValue
      : minN;
  const ratio = maxN > minN ? (v - minN) / (maxN - minN) : 0;
  const inputCls = className ? `${styles.input} ${className}` : styles.input;
  const sliderEl = (
    <input
      id={resolvedId}
      type="range"
      className={inputCls}
      min={minN}
      max={maxN}
      value={value}
      defaultValue={defaultValue}
      style={{ ["--ds-slider-fill" as string]: `${(ratio * 100).toFixed(2)}%` }}
      {...rest}
    />
  );

  if (label === undefined) {
    return sliderEl;
  }
  return (
    <span className={styles.row}>
      <label className={styles.label} htmlFor={resolvedId}>
        {label}
      </label>
      {sliderEl}
    </span>
  );
}
