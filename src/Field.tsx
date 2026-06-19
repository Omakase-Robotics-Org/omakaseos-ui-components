/**
 * @file Field — labeled control wrapper with optional help and error text.
 *
 * The library does not ship "TextField" / "SelectField" as separate
 * components: that would be N copies of the same label/help/error code,
 * one per control type. Instead Field wraps any single control, generates
 * a stable id (or accepts one), wires `htmlFor`, and renders error/help
 * text below.
 *
 * Usage:
 *   <Field label="Email" help="We never share it.">
 *     {(id) => <Input id={id} type="email" value={...} onChange={...} />}
 *   </Field>
 *
 *   <Field label="Region" error={touched && !value ? "required" : undefined}>
 *     {(id) => <Select id={id} ...>{options}</Select>}
 *   </Field>
 *
 * The render-prop shape is what makes Field generic over Input / Select /
 * Textarea / a future Combobox / a future Date picker — Field hands the
 * control an id and lets it own its own props. ARIA wiring (aria-invalid,
 * aria-describedby) is left to the control because each control's invalid
 * affordance differs (border tint vs. summary text vs. an alert icon).
 */
import { useId } from "react";
import type { ReactNode } from "react";
import styles from "./Field.module.css";

export type FieldProps = {
  /** Visible label. */
  label: string;
  /** Help text shown below the control. Suppressed when `error` is set. */
  help?: ReactNode;
  /** Error text shown below the control. Takes precedence over `help`. */
  error?: ReactNode;
  /** Pre-existing id; if omitted, Field generates a stable one. */
  id?: string;
  className?: string;
  /**
   * Render-prop receiving the id to attach to the inner control.
   * Use `(id) => <Input id={id} .../>` so the control owns its props.
   */
  children: (id: string) => ReactNode;
};

export function Field({ label, help, error, id, className, children }: FieldProps) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const cls = className ? `${styles.field} ${className}` : styles.field;
  return (
    <div className={cls}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      {children(fieldId)}
      {error !== undefined ? (
        <p className={styles.error}>{error}</p>
      ) : help !== undefined ? (
        <p className={styles.help}>{help}</p>
      ) : null}
    </div>
  );
}
