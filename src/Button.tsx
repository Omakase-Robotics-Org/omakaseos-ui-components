/**
 * @file Button — primary action / secondary / ghost / danger variants.
 *
 * The library deliberately does NOT carry an icon prop or busy-state prop
 * (those belong to higher-level wrappers like ActionButton in the dashboard).
 * The library provides the visual shell; consumers compose icons or spinners
 * as children.
 *
 * Long labels: the button does not truncate by default. If a parent (Toolbar,
 * narrow Card, table cell) constrains width, the button respects that AND
 * keeps the label visible by ellipsizing. Use `truncate={false}` to opt out
 * (e.g., to allow a 2-line label inside a wide CTA).
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  truncate?: boolean;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  truncate,
  type,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={className ? `${styles.button} ${className}` : styles.button}
      data-variant={variant ?? "secondary"}
      data-size={size ?? "md"}
      data-truncate={truncate === false ? undefined : "true"}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
    </button>
  );
}
