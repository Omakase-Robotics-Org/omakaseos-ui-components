/**
 * @file Input — single-line text input shell.
 *
 * Native <input> element wrapped only in CSS so all native behaviors
 * (autocomplete, password toggles, type=email/url validation) survive.
 * The component does NOT compose a label — wrap with <Field label="…">
 * (out of scope for v0.3.0; coming with form scaffolding) or pair with
 * a <label htmlFor=…> directly.
 *
 * `invalid` flips the border to danger; consumers manage validation
 * outside (the library does not run validators).
 */
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  inputSize?: InputSize;
  invalid?: boolean;
};

export function Input({ inputSize, invalid, className, type, ...rest }: InputProps) {
  return (
    <input
      type={type ?? "text"}
      className={className ? `${styles.input} ${className}` : styles.input}
      data-size={inputSize ?? "md"}
      data-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? "true" : undefined}
      {...rest}
    />
  );
}
