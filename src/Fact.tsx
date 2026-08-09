/**
 * @file Fact + FactList + FactGrid — labeled value pair and its containers.
 *
 * A `Fact` is one labeled value. Direction `row` puts label and value on
 * opposite ends (the dashboard status pattern); `column` stacks them (the
 * tile pattern).
 *
 * The two containers are two different readings of a set of facts, and a
 * `Fact` renders differently in each:
 *
 * - `FactList` — a vertical run of rows on the surface it already sits on.
 *   Read top to bottom, one after another: "name, connection, battery".
 * - `FactGrid` (v0.11) — a two-column grid of inset tiles, each fact
 *   standing on its own recessed surface with a small uppercase caption
 *   over a large monospaced figure. Read as a dashboard of readings taken
 *   at a glance, not as a list. This is the robot console's `StatsGrid`
 *   pattern (34+ call sites), which the `column` direction was originally
 *   added here to receive; the tile surface itself was the missing half.
 *   See `omksos_web/reports/rssa-ui-unification/README.md`.
 *
 * The tile look belongs to the grid, not to the fact: a `Fact` is a tile
 * exactly when it is a child of a `FactGrid`, so a call site cannot end up
 * with a tile-styled row or an unstyled tile. Give those facts
 * `direction="column"` — that is what makes the caption sit above its
 * figure.
 */
import type { ReactNode } from "react";
import styles from "./Fact.module.css";

export type FactDirection = "row" | "column";

/**
 * How much room the value asks for, inside a `FactGrid` tile.
 *
 * `md` (the default) is the display-sized figure a tile is built around: a
 * percentage, a temperature, a count. `sm` is for a value that is text
 * rather than a figure — a path, a device name, a "--" placeholder — which
 * at display size reads as shouting and wraps out of its tile. The robot
 * console splits its stats exactly this way (`small: true` on 34 of them).
 *
 * In a `FactList` row the value takes the surrounding text size, so this
 * has no effect there; the attribute is still emitted, so a test can see
 * what the call site asked for.
 */
export type FactSize = "md" | "sm";

export type FactProps = {
  label: string;
  direction?: FactDirection;
  size?: FactSize;
  children: ReactNode;
};

export function Fact({ label, direction, size, children }: FactProps) {
  return (
    <div
      className={styles.fact}
      data-direction={direction ?? "row"}
      data-size={size ?? "md"}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

/** A vertical run of facts, read one after another. */
export function FactList(props: { children: ReactNode }) {
  return <div className={styles.list}>{props.children}</div>;
}

/**
 * A two-column grid of facts, each on its own inset tile — readings taken
 * at a glance rather than a list. Give its children `direction="column"`.
 *
 * Two columns is the layout, not a default to be tuned: the tile's caption
 * and figure are sized for half of a panel body, which is where every call
 * site puts it. A set of facts that wants a different shape wants
 * `FactList`, or its own layout around plain `Fact`s.
 */
export function FactGrid(props: { children: ReactNode }) {
  return <div className={styles.grid}>{props.children}</div>;
}
