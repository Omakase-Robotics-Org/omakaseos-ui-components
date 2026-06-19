/**
 * @file Fact + FactList — labeled value pair and its vertical container.
 *
 * Direction `row` puts label and value on opposite ends (the dashboard
 * status pattern); `column` stacks them vertically (the StatsGrid tile
 * pattern from status_server_webui).
 */
import type { ReactNode } from "react";
import styles from "./Fact.module.css";

export type FactDirection = "row" | "column";

export type FactProps = {
  label: string;
  direction?: FactDirection;
  children: ReactNode;
};

export function Fact({ label, direction, children }: FactProps) {
  return (
    <div className={styles.fact} data-direction={direction ?? "row"}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

export function FactList(props: { children: ReactNode }) {
  return <div className={styles.list}>{props.children}</div>;
}
