/**
 * @file Fact + FactList + FactGrid + FactColumns — labeled value pair and its containers.
 *
 * A `Fact` is one labeled value. Direction `row` puts label and value on
 * opposite ends (the dashboard status pattern); `column` stacks them (the
 * tile pattern).
 *
 * The containers are different readings of a set of facts, and a `Fact`
 * renders differently in each:
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
 * - `FactColumns` — a surfaceless, auto-fit page-scale grid whose facts use
 *   native `<dt>`/`<dd>` relationships. It is a third reading alongside the
 *   list and tile readings: FactGrid's fixed two columns and inset tile are
 *   its identity, while FactColumns deliberately owns neither.
 *
 * The tile look belongs to the grid, not to the fact: a `Fact` is a tile
 * exactly when it is a child of a `FactGrid`, so a call site cannot end up
 * with a tile-styled row or an unstyled tile. Give those facts
 * `direction="column"` — that is what makes the caption sit above its
 * figure.
 */
import { createContext, useContext, type ReactNode } from "react";
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

/** The value ink register used by page-scale facts. */
export type FactTone = "default" | "muted" | "missing";

/** True while a Fact is composed inside a FactColumns definition list. */
const FactColumnsScope = createContext(false);

export type FactProps = {
  label: string;
  direction?: FactDirection;
  size?: FactSize;
  tone?: FactTone;
  hint?: ReactNode;
  children: ReactNode;
};

export function Fact({
  label,
  direction,
  size,
  tone = "default",
  hint,
  children,
}: FactProps) {
  const insideColumns = useContext(FactColumnsScope);
  const valueClassName =
    tone === "default"
      ? styles.value
      : `${styles.value} ${tone === "muted" ? styles.valueMuted : styles.valueMissing}`;
  const toneAttribute = tone === "default" ? undefined : tone;
  const hintElement = hint === undefined ? null : <span className={styles.hint}>{hint}</span>;

  if (insideColumns) {
    return (
      <div
        className={styles.fact}
        data-direction={direction ?? "row"}
        data-size={size ?? "md"}
        data-tone={toneAttribute}
      >
        <dt className={styles.label}>{label}</dt>
        <dd className={valueClassName}>
          <span className={styles.valueText}>{children}</span>
          {hintElement}
        </dd>
      </div>
    );
  }

  return (
    <div
      className={styles.fact}
      data-direction={direction ?? "row"}
      data-size={size ?? "md"}
      data-tone={toneAttribute}
    >
      <span className={styles.label}>{label}</span>
      {hint === undefined ? (
        <span className={valueClassName}>{children}</span>
      ) : (
        <span className={`${valueClassName} ${styles.valueWithHint}`}>
          <span className={styles.valueText}>{children}</span>
          {hintElement}
        </span>
      )}
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

/**
 * A surfaceless, auto-fit grid of page-scale facts. The scope changes each
 * Fact to a `<dt>`/`<dd>` pair so the browser can announce its label and value
 * as a relationship rather than two decorative spans.
 */
export function FactColumns(props: { children: ReactNode }) {
  return (
    <FactColumnsScope.Provider value={true}>
      <dl className={styles.columns}>{props.children}</dl>
    </FactColumnsScope.Provider>
  );
}
