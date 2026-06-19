/**
 * @file ButtonRow — horizontal group container for buttons.
 *
 * Margin-free on purpose: both consuming apps disagree on whether the
 * surrounding margin is top or bottom. Outer spacing is the parent's
 * responsibility.
 */
import type { ReactNode } from "react";
import styles from "./ButtonRow.module.css";

export function ButtonRow(props: { children: ReactNode }) {
  return <div className={styles.row}>{props.children}</div>;
}
