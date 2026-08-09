/**
 * @file Panel — a titled section that occupies one cell of a page grid.
 *
 * Status layer. Added in v0.11 from `robot-status-server-app`
 * (`src/components/ui/Panel.tsx`, 39 call sites — every screen of the
 * robot console is a grid of these). See
 * `omksos_web/reports/rssa-ui-unification/README.md`.
 *
 * ## Panel is not Card, and neither is a variant of the other
 *
 * `Card` is a surface that holds a run of related rows inside a page: a
 * softer header that carries a `hint` and a `right` slot, no divider, and
 * padding that continues straight into the content. It is what a list of
 * facts sits on.
 *
 * `Panel` is a *section of the page itself*. It is one cell of a grid of
 * peers, so it states its identity the way a section heading does — a
 * small, uppercase, letter-spaced title over a hard divider — and it
 * carries the two things a grid cell needs and a card does not:
 * `fullWidth`, which spans every column of the grid it sits in, and `id`,
 * which makes it the target of an in-page anchor (the console links to
 * four of its panels this way).
 *
 * Collapsing the two would mean either giving `Card` a grid-cell mode it
 * has no business knowing about, or restyling every existing `Card` call
 * site in the dashboard. So both exist, and the question a caller asks is
 * "is this a section of the page, or a surface within one?".
 *
 * The header renders an `<h2>`, so a page built out of Panels has a real
 * document outline.
 */
import type { ReactNode } from "react";
import styles from "./Panel.module.css";

export type PanelProps = {
  title: string;
  /** Span every column of the grid this panel sits in. */
  fullWidth?: boolean;
  /** Controls or status that belong to the panel as a whole (right of the title). */
  headerRight?: ReactNode;
  children: ReactNode;
  /** Anchor target: rendered on the `<section>` so the page can link here. */
  id?: string;
};

/** A titled section of a page grid, with a header bar and a padded body. */
export function Panel({ title, fullWidth, headerRight, children, id }: PanelProps) {
  return (
    <section
      id={id}
      className={styles.panel}
      data-full-width={fullWidth ? "true" : undefined}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {headerRight}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
