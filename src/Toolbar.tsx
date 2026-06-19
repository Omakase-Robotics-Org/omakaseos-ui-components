/**
 * @file Toolbar — horizontal action group with role="toolbar".
 *
 * The library's hardest layout case: a row that mixes a flexible-width
 * search Input with fixed-width Buttons. The naive flex parent does NOT
 * apply min-width: 0 to children, so a long Input value pushes the buttons
 * out of view. Toolbar fixes this by pushing min-width: 0 onto every direct
 * child via :where(> *), and exposing a `growIndex` to pick which child
 * absorbs free space (default: 0 — the first child grows).
 *
 * Layout shape:
 *   align: 'start' | 'between' | 'end'
 *   justify defaults to flex (start); 'between' uses justify-content
 *
 * Toolbar does NOT impose its own outer margin (mirrors the ButtonRow
 * decision). Wrap the toolbar in a Card body or panel section that owns
 * the spacing.
 */
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Toolbar.module.css";

export type ToolbarAlign = "start" | "between" | "end";

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  align?: ToolbarAlign;
  ariaLabel?: string;
  children: ReactNode;
};

export function Toolbar({
  align,
  ariaLabel,
  className,
  children,
  ...rest
}: ToolbarProps) {
  return (
    <div
      {...rest}
      role="toolbar"
      aria-label={ariaLabel ?? rest["aria-label"]}
      className={className ? `${styles.toolbar} ${className}` : styles.toolbar}
      data-align={align ?? "start"}
    >
      {children}
    </div>
  );
}
